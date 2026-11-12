import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { SqlDriver } from '../../core/db/driver';
import { findScan, type LocalAccountScope } from '../../core/db/repositories/scans';
import { listMonitoringSessions, type MonitoringCheckpoint } from '../../core/db/repositories/monitoring';
import type { ScanSummary } from '../viewModels';

export interface MonitoringListRow {
  id: string;
  sourceScanId: string;
  source: ScanSummary;
  checkpoints: MonitoringCheckpoint[];
}

export interface UseMonitoringListInput {
  db: SqlDriver;
  scope: LocalAccountScope;
  dataVersion: number;
}

export interface MonitoringListController {
  rows: MonitoringListRow[];
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
}

interface ReadState {
  db: SqlDriver;
  accountId: string | null;
  rows: MonitoringListRow[];
  loading: boolean;
  error: boolean;
}

/** Reads persisted sessions without creating them or inventing observations. */
export function useMonitoringList({ db, scope, dataVersion }: UseMonitoringListInput): MonitoringListController {
  const accountId = scope.activeAccountId;
  const [state, setState] = useState<ReadState>({ db, accountId, rows: [], loading: true, error: false });
  const generation = useRef(0);
  const mounted = useRef(false);

  const reload = useCallback(async () => {
    if (!mounted.current) return;
    const read = ++generation.current;
    const current = () => mounted.current && generation.current === read;
    setState(previous => ({
      db, accountId,
      rows: previous.db === db && previous.accountId === accountId ? previous.rows : [],
      loading: true, error: false,
    }));
    try {
      const readScope = { activeAccountId: accountId };
      const sessions = await listMonitoringSessions(db, readScope);
      if (!current()) return;
      const rows = sessions.flatMap(session => {
        const source = findScan(db, session.sourceScanId, readScope);
        return source ? [{ id: session.id, sourceScanId: session.sourceScanId, source, checkpoints: session.checkpoints }] : [];
      });
      if (current()) setState({ db, accountId, rows, loading: false, error: false });
    } catch {
      if (current()) setState(previous => ({ ...previous, loading: false, error: true }));
    }
  }, [db, accountId]);

  // Layout cleanup invalidates the old scope before the next scope can be shown.
  useLayoutEffect(() => {
    mounted.current = true;
    void reload();
    return () => { mounted.current = false; generation.current += 1; };
  }, [reload, dataVersion]);

  // Hide prior account data in the render itself, including before effects run.
  const visible = state.db === db && state.accountId === accountId;
  return { rows: visible ? state.rows : [], loading: visible ? state.loading : true, error: visible && state.error, reload };
}
