import { createTestDriver } from '../../../core/db/testing/betterSqliteDriver';
import { migrate } from '../../../core/db/migrate';
import { SqlDriver } from '../../../core/db/driver';
import {
  createMonitoringSession,
  getMonitoringSession,
  getMonitoringSessionForScan,
  listMonitoringSessions,
  completeCheckpoint,
} from '../../../core/db/repositories/monitoring';
import { LocalAccountScope } from '../../../core/auth/scope';

describe('monitoringRepository', () => {
  let db: SqlDriver;

  beforeEach(() => {
    db = createTestDriver();
    migrate(db);

    // Setup base data
    db.exec(`
      INSERT INTO scan (uuid, image_uri, created_at, account_id) 
      VALUES ('scan1', 'uri', '2026-09-01T00:00:00Z', 'user1');
      INSERT INTO scan (uuid, image_uri, created_at, account_id) 
      VALUES ('scan2', 'uri2', '2026-09-01T00:00:00Z', NULL);
    `);
  });

  const scope1: LocalAccountScope = { kind: 'local', accountId: 'user1' };
  const unownedScope: LocalAccountScope = { kind: 'local', accountId: null };

  it('creates an idempotent session per source scan', async () => {
    const session1 = await createMonitoringSession(db, 'scan1', scope1);
    expect(session1.id).toBeDefined();
    expect(session1.sourceScanId).toBe('scan1');

    // duplicate creation should return same session id
    const session2 = await createMonitoringSession(db, 'scan1', scope1);
    expect(session2.id).toBe(session1.id);
  });

  it('generates source scan as Day 1 and creates only Day 5 and Day 10 checkpoints', async () => {
    const session = await createMonitoringSession(db, 'scan1', scope1);
    
    // Validate checkpoints created
    const rows = db.all<{ day_number: number }>('SELECT day_number FROM monitoring_checkpoint WHERE session_id = ?', [session.id]);
    const days = rows.map(r => r.day_number);
    
    expect(days).not.toContain(1); // source scan is day 1 implicitly
    expect(days).toContain(5);
    expect(days).toContain(10);
    expect(days.length).toBe(2);
  });

  it('enforces observation enum: better, same, worse, unsure', async () => {
    const session = await createMonitoringSession(db, 'scan1', scope1);
    
    await expect(completeCheckpoint(db, session.id, 5, { observation: 'better' }, scope1)).resolves.not.toThrow();
    await expect(completeCheckpoint(db, session.id, 10, { observation: 'same' }, scope1)).resolves.not.toThrow();

    db.exec('PRAGMA foreign_keys = ON'); // Ensure check constraints
    expect(() => 
      db.exec(`UPDATE monitoring_checkpoint SET observation = 'invalid' WHERE session_id = '${session.id}'`)
    ).toThrow();
  });

  it('separates scheduled and actual timestamps', async () => {
    const baseDate = new Date('2026-09-01T12:00:00Z').getTime();
    const session = await createMonitoringSession(db, 'scan1', scope1, baseDate);
    
    const cp5 = db.get<{ scheduled_date: number; completed_date: number | null }>(
      'SELECT scheduled_date, completed_date FROM monitoring_checkpoint WHERE session_id = ? AND day_number = 5',
      [session.id]
    );
    expect(cp5?.scheduled_date).toBe(baseDate + 5 * 24 * 60 * 60 * 1000);
    expect(cp5?.completed_date).toBeNull();
  });

  it('accepts optional note and local photo URI', async () => {
    const session = await createMonitoringSession(db, 'scan1', scope1);
    const completed = await completeCheckpoint(db, session.id, 5, { 
      observation: 'unsure', 
      note: 'test note', 
      photoUri: 'file:///local/photo.jpg' 
    }, scope1);

    const cp5 = completed.checkpoints.find((c: any) => c.dayNumber === 5);
    expect(cp5?.note).toBe('test note');
    expect(cp5?.photoUri).toBe('file:///local/photo.jpg');
    expect(cp5?.completedDate).toBeDefined();
  });

  it('enforces account isolation', async () => {
    await createMonitoringSession(db, 'scan1', scope1);
    await createMonitoringSession(db, 'scan2', unownedScope);

    const user1Sessions = await listMonitoringSessions(db, scope1);
    expect(user1Sessions.length).toBe(1);
    expect(user1Sessions[0].sourceScanId).toBe('scan1');

    const unownedSessions = await listMonitoringSessions(db, unownedScope);
    expect(unownedSessions.length).toBe(1);
    expect(unownedSessions[0].sourceScanId).toBe('scan2');
    
    // Cross scope access fails
    await expect(getMonitoringSessionForScan(db, 'scan1', unownedScope)).rejects.toThrow();
  });
});
