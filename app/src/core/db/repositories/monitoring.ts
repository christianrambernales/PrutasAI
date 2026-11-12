import type { SqlDriver } from '../driver';
import { type LocalAccountScope, buildScopeCondition } from './scans';

export interface MonitoringCheckpoint {
  id: string;
  dayNumber: number;
  scheduledDate: number;
  completedDate: number | null;
  observation: 'better' | 'same' | 'worse' | 'unsure' | null;
  note: string | null;
  photoUri: string | null;
}

export interface MonitoringSession {
  id: string;
  sourceScanId: string;
  /** Immutable Day 1 timestamp, read from the persisted source scan. */
  sourceCreatedAt: number;
  checkpoints: MonitoringCheckpoint[];
}

function generateId(): string {
  // simple mock id for repo tests, can use crypto in real app
  return Math.random().toString(36).substring(2, 15);
}

export async function createMonitoringSession(
  db: SqlDriver,
  sourceScanId: string,
  scope: LocalAccountScope = { activeAccountId: null },
  // Retained for call compatibility while Phase 4 routes converge. Schedules
  // are deliberately derived from scan.created_at, never this caller value.
  _legacyBaseDate?: number,
): Promise<MonitoringSession> {
  const msPerDay = 24 * 60 * 60 * 1000;
  const source = findAccessibleSourceScan(db, sourceScanId, scope);
  if (!source) {
    throw new Error('Source scan not found or access denied');
  }

  const existing = await getMonitoringSessionForScan(db, sourceScanId, scope);
  if (existing) return existing;

  const sessionId = 'session_' + generateId();
  db.transaction(() => {
    // Check again inside the write transaction so retried callers do not make
    // a second lifecycle for the same Day 1 scan.
    const alreadyCreated = db.get<{ id: string }>(
      'SELECT id FROM monitoring_session WHERE source_scan_id = ? AND account_id IS ?',
      [sourceScanId, source.accountId],
    );
    if (alreadyCreated) return;

    db.get(
      'INSERT INTO monitoring_session (id, source_scan_id, account_id, created_at) VALUES (?, ?, ?, ?) RETURNING id',
      [sessionId, sourceScanId, source.accountId, Date.now()]
    );

    // Day 1 is the source scan itself. Day 5 and Day 10 are calendar days
    // five and ten in that timeline, hence +4 and +9 elapsed days.
    db.get(
      'INSERT INTO monitoring_checkpoint (id, session_id, day_number, scheduled_date) VALUES (?, ?, ?, ?) RETURNING id',
      ['cp5_' + generateId(), sessionId, 5, source.createdAt + 4 * msPerDay]
    );

    db.get(
      'INSERT INTO monitoring_checkpoint (id, session_id, day_number, scheduled_date) VALUES (?, ?, ?, ?) RETURNING id',
      ['cp10_' + generateId(), sessionId, 10, source.createdAt + 9 * msPerDay]
    );
  });

  return (await getMonitoringSessionForScan(db, sourceScanId, scope))!;
}

interface AccessibleSourceScan {
  accountId: string | null;
  createdAt: number;
}

/**
 * The monitoring baseline is a real persisted scan, not a caller-provided
 * timestamp. The same account predicate used by scan reads prevents a caller
 * from attaching a checkpoint timeline to another local account's scan.
 */
function findAccessibleSourceScan(
  db: SqlDriver,
  sourceScanId: string,
  scope: LocalAccountScope,
): AccessibleSourceScan | null {
  const { clause, params } = buildScopeCondition(scope, 's');
  const row = db.get<{ account_id: string | null; created_at: string }>(
    `SELECT s.account_id, s.created_at
       FROM scan s
      WHERE s.uuid = ? AND s.deleted_at IS NULL AND ${clause}`,
    [sourceScanId, ...params],
  );
  if (!row) return null;
  const createdAt = Date.parse(row.created_at);
  if (!Number.isFinite(createdAt)) {
    throw new Error('Source scan has an invalid created_at timestamp');
  }
  return { accountId: row.account_id, createdAt };
}

export async function getMonitoringSession(
  db: SqlDriver,
  sessionId: string,
  scope: LocalAccountScope = { activeAccountId: null }
): Promise<MonitoringSession | null> {
  const { clause, params } = buildScopeCondition(scope, 'monitoring_session');
  const sourceScope = buildScopeCondition(scope, 'scan');
  
  const sessionRow = db.get<{ id: string; source_scan_id: string; source_created_at: string }>(
    `SELECT monitoring_session.id, monitoring_session.source_scan_id, scan.created_at AS source_created_at
       FROM monitoring_session
       JOIN scan ON scan.uuid = monitoring_session.source_scan_id
      WHERE monitoring_session.id = ?
        AND scan.deleted_at IS NULL
        AND ${clause}
        AND ${sourceScope.clause}`,
    [sessionId, ...params, ...sourceScope.params]
  );

  if (!sessionRow) return null;
  const sourceCreatedAt = Date.parse(sessionRow.source_created_at);
  if (!Number.isFinite(sourceCreatedAt)) {
    throw new Error('Source scan has an invalid created_at timestamp');
  }

  const checkpointRows = db.all<{
    id: string;
    day_number: number;
    scheduled_date: number;
    completed_date: number | null;
    observation: 'better' | 'same' | 'worse' | 'unsure' | null;
    note: string | null;
    photo_uri: string | null;
  }>(
    'SELECT id, day_number, scheduled_date, completed_date, observation, note, photo_uri FROM monitoring_checkpoint WHERE session_id = ? ORDER BY day_number ASC',
    [sessionId]
  );

  return {
    id: sessionRow.id,
    sourceScanId: sessionRow.source_scan_id,
    sourceCreatedAt,
    checkpoints: checkpointRows.map(r => ({
      id: r.id,
      dayNumber: r.day_number,
      scheduledDate: r.scheduled_date,
      completedDate: r.completed_date,
      observation: r.observation,
      note: r.note,
      photoUri: r.photo_uri
    }))
  };
}

export async function getMonitoringSessionForScan(
  db: SqlDriver,
  sourceScanId: string,
  scope: LocalAccountScope = { activeAccountId: null }
): Promise<MonitoringSession | null> {
  const { clause, params } = buildScopeCondition(scope, 'monitoring_session');
  
  const sessionRow = db.get<{ id: string }>(
    `SELECT id FROM monitoring_session WHERE source_scan_id = ? AND ${clause}`,
    [sourceScanId, ...params]
  );

  if (!sessionRow) return null;
  return getMonitoringSession(db, sessionRow.id, scope);
}

export async function listMonitoringSessions(
  db: SqlDriver,
  scope: LocalAccountScope = { activeAccountId: null }
): Promise<MonitoringSession[]> {
  const { clause, params } = buildScopeCondition(scope, 'monitoring_session');
  
  const sessionRows = db.all<{ id: string }>(
    `SELECT id FROM monitoring_session WHERE ${clause} ORDER BY created_at DESC`,
    params
  );

  const sessions: MonitoringSession[] = [];
  for (const row of sessionRows) {
    const s = await getMonitoringSession(db, row.id, scope);
    if (s) sessions.push(s);
  }
  return sessions;
}

export async function completeCheckpoint(
  db: SqlDriver,
  sessionId: string,
  dayNumber: number,
  update: { observation: string; note?: string; photoUri?: string },
  scope: LocalAccountScope = { activeAccountId: null }
): Promise<MonitoringSession> {
  // Ensure session exists and is accessible in scope
  const session = await getMonitoringSession(db, sessionId, scope);
  if (!session) {
    throw new Error('Monitoring session not found or access denied');
  }

  const cp = session.checkpoints.find(c => c.dayNumber === dayNumber);
  if (!cp) throw new Error('Checkpoint not found');

  db.get(
    `UPDATE monitoring_checkpoint 
     SET observation = ?, note = ?, photo_uri = ?, completed_date = ? 
     WHERE id = ? RETURNING id`,
    [
      update.observation,
      update.note ?? null,
      update.photoUri ?? null,
      Date.now(),
      cp.id
    ]
  );

  return (await getMonitoringSession(db, sessionId, scope))!;
}
