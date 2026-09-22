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
  baseDate: number = Date.now()
): Promise<MonitoringSession> {
  const existing = await getMonitoringSessionForScan(db, sourceScanId, scope);
  if (existing) return existing;

  const sessionId = 'session_' + generateId();
  const msPerDay = 24 * 60 * 60 * 1000;
  
  db.transaction(() => {
    db.get(
      'INSERT INTO monitoring_session (id, source_scan_id, account_id, created_at) VALUES (?, ?, ?, ?) RETURNING id',
      [sessionId, sourceScanId, scope.activeAccountId, baseDate]
    );

    // Day 5
    db.get(
      'INSERT INTO monitoring_checkpoint (id, session_id, day_number, scheduled_date) VALUES (?, ?, ?, ?) RETURNING id',
      ['cp5_' + generateId(), sessionId, 5, baseDate + 5 * msPerDay]
    );

    // Day 10
    db.get(
      'INSERT INTO monitoring_checkpoint (id, session_id, day_number, scheduled_date) VALUES (?, ?, ?, ?) RETURNING id',
      ['cp10_' + generateId(), sessionId, 10, baseDate + 10 * msPerDay]
    );
  });

  return (await getMonitoringSession(db, sessionId, scope))!;
}

export async function getMonitoringSession(
  db: SqlDriver,
  sessionId: string,
  scope: LocalAccountScope = { activeAccountId: null }
): Promise<MonitoringSession | null> {
  const { clause, params } = buildScopeCondition(scope, 'monitoring_session');
  
  const sessionRow = db.get<{ id: string; source_scan_id: string }>(
    `SELECT id, source_scan_id FROM monitoring_session WHERE id = ? AND ${clause}`,
    [sessionId, ...params]
  );

  if (!sessionRow) return null;

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
