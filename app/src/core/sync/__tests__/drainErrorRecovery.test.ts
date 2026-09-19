import { drainScans } from '../drain';
import { insertScan, pendingScans } from '../../db/repositories/scans';
import { seededDb, sampleScan } from '../../db/testing/scanFixtures';

test('a permanent first-row rejection does not block a later owner row', async () => {
  const db = seededDb();
  insertScan(db, sampleScan({ uuid: '11111111-1111-4111-8111-111111111111', accountId: 'owner' }));
  insertScan(db, sampleScan({ uuid: '22222222-2222-4222-8222-222222222222', accountId: 'owner' }));
  let calls = 0;
  const report = await drainScans({
    db, baseUrl: 'https://x.test/api', deviceId: 'd', accessToken: 't', userId: 'owner',
    fetchImpl: (async () => ({ status: ++calls === 1 ? 422 : 200, headers: new Headers() })) as unknown as typeof fetch,
  });
  expect(report).toMatchObject({ attempted: 2, synced: 1, failed: 1 });
  expect(pendingScans(db, 50, { activeAccountId: 'owner' })).toEqual([]);
  expect(db.get<{ sync_status: string }>('SELECT sync_status FROM scan WHERE uuid = ?', ['11111111-1111-4111-8111-111111111111'])?.sync_status).toBe('needs_attention');
});

test('a transient failure persists a retry time without dropping the owner row', async () => {
  const db = seededDb();
  insertScan(db, sampleScan({ uuid: '33333333-3333-4333-8333-333333333333', accountId: 'owner' }));
  await drainScans({
    db, baseUrl: 'https://x.test/api', deviceId: 'd', accessToken: 't', userId: 'owner',
    now: () => new Date('2026-09-19T00:00:00.000Z'), fetchImpl: (async () => { throw new Error('offline'); }) as typeof fetch,
  });
  const row = db.get<{ retry_count: number; next_retry_at: string | null }>('SELECT retry_count, next_retry_at FROM scan WHERE uuid = ?', ['33333333-3333-4333-8333-333333333333']);
  expect(row?.retry_count).toBe(1);
  expect(row?.next_retry_at).not.toBeNull();
});
