import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestDriver } from '../../../core/db/testing/betterSqliteDriver';
import { migrate } from '../../../core/db/migrate';
import { createMonitoringSession, completeCheckpoint, listMonitoringSessions, type MonitoringSession } from '../../../core/db/repositories/monitoring';
import type { SqlDriver } from '../../../core/db/driver';
import { useMonitoringList } from '../useMonitoringList';

jest.mock('../../../core/db/repositories/monitoring', () => ({
  ...jest.requireActual('../../../core/db/repositories/monitoring'),
  listMonitoringSessions: jest.fn(jest.requireActual('../../../core/db/repositories/monitoring').listMonitoringSessions),
}));
const list = jest.mocked(listMonitoringSessions);
const scopeA = { activeAccountId: 'account-a' };
const scopeB = { activeAccountId: 'account-b' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('useMonitoringList', () => {
  let db: SqlDriver;
  let sessionA: MonitoringSession;
  let sessionB: MonitoringSession;
  beforeEach(async () => {
    list.mockReset().mockImplementation(jest.requireActual('../../../core/db/repositories/monitoring').listMonitoringSessions);
    db = createTestDriver();
    migrate(db);
    db.exec(`INSERT INTO scan (uuid, image_uri, created_at, account_id) VALUES
      ('scan-a', 'file:///a.jpg', '2026-10-01T00:00:00Z', 'account-a'),
      ('scan-b', 'file:///b.jpg', '2026-10-02T00:00:00Z', 'account-b');`);
    sessionA = await createMonitoringSession(db, 'scan-a', scopeA);
    sessionB = await createMonitoringSession(db, 'scan-b', scopeB);
  });

  it('projects real scoped sessions and refreshes after checkpoint mutations', async () => {
    const { result, rerender } = await renderHook(
      ({ dataVersion }: { dataVersion: number }) => useMonitoringList({ db, scope: scopeA, dataVersion }),
      { initialProps: { dataVersion: 0 } },
    );
    await waitFor(() => expect(result.current.rows.map(row => row.sourceScanId)).toEqual(['scan-a']));
    expect(result.current.rows[0].id).toBe(sessionA.id);
    expect(result.current.rows[0].source.id).toBe('scan-a');
    await completeCheckpoint(db, sessionA.id, 5, { observation: 'same' }, scopeA);
    await rerender({ dataVersion: 1 });
    await waitFor(() => expect(result.current.rows[0].checkpoints[0].observation).toBe('same'));
  });

  it('clears prior account rows while replacement reads are pending and ignores older completions', async () => {
    const { result, rerender } = await renderHook(
      ({ scope }: { scope: { activeAccountId: string } }) => useMonitoringList({ db, scope, dataVersion: 0 }),
      { initialProps: { scope: scopeA } },
    );
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    const oldRead = deferred<MonitoringSession[]>();
    list.mockReturnValueOnce(oldRead.promise);
    let refresh!: Promise<void>;
    await act(() => { refresh = result.current.reload(); });
    const newRead = deferred<MonitoringSession[]>();
    list.mockReturnValueOnce(newRead.promise);
    await rerender({ scope: scopeB });
    expect(result.current.rows).toEqual([]);
    expect(result.current.loading).toBe(true);
    await act(async () => { newRead.resolve([sessionB]); });
    expect(result.current.rows.map(row => row.sourceScanId)).toEqual(['scan-b']);
    await act(async () => { oldRead.resolve([sessionA]); await refresh; });
    expect(result.current.rows.map(row => row.sourceScanId)).toEqual(['scan-b']);
  });

  it('omits missing, deleted and inaccessible source scans', async () => {
    db.exec("UPDATE scan SET deleted_at = '2026-10-03T00:00:00Z' WHERE uuid = 'scan-a'");
    list.mockResolvedValueOnce([sessionA, sessionB, { ...sessionA, sourceScanId: 'missing' }]);
    const { result } = await renderHook(() => useMonitoringList({ db, scope: scopeA, dataVersion: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows).toEqual([]);
    expect(result.current.error).toBe(false);
  });

  it('reports read failure and reloads on retry', async () => {
    list.mockRejectedValueOnce(new Error('private database details'));
    const { result } = await renderHook(() => useMonitoringList({ db, scope: scopeA, dataVersion: 0 }));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.rows).toEqual([]);
    await act(async () => { await result.current.reload(); });
    expect(result.current.error).toBe(false);
    expect(result.current.rows).toHaveLength(1);
  });

  it('ignores read resolution after unmount', async () => {
    const pending = deferred<MonitoringSession[]>();
    list.mockReturnValueOnce(pending.promise);
    const { result, unmount } = await renderHook(() => useMonitoringList({ db, scope: scopeA, dataVersion: 0 }));
    expect(result.current.loading).toBe(true);
    await unmount();
    const reads = jest.spyOn(db, 'get');
    await act(async () => { pending.resolve([sessionA]); });
    expect(reads).not.toHaveBeenCalled();
  });

  it('keeps the latest same-account refresh when an earlier refresh fails late', async () => {
    const { result } = await renderHook(() => useMonitoringList({ db, scope: scopeA, dataVersion: 0 }));
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    const older = deferred<MonitoringSession[]>();
    const newer = deferred<MonitoringSession[]>();
    list.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    let olderReload!: Promise<void>;
    let newerReload!: Promise<void>;
    await act(() => { olderReload = result.current.reload(); });
    await act(() => { newerReload = result.current.reload(); });
    expect(result.current.rows).toHaveLength(1);
    await act(async () => { newer.resolve([]); await newerReload; });
    await act(async () => { older.reject(new Error('old failure')); await olderReload; });
    expect(result.current.rows).toEqual([]);
    expect(result.current.error).toBe(false);
    expect(result.current.loading).toBe(false);
  });
});
