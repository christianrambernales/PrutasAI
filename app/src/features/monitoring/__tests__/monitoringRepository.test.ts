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
import { claimUnownedScans, type LocalAccountScope } from '../../../core/db/repositories/scans';

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

  const scope1: LocalAccountScope = { activeAccountId: 'user1' };
  const unownedScope: LocalAccountScope = { activeAccountId: null };
  const sourceCreatedAt = new Date('2026-09-01T00:00:00Z').getTime();

  it('creates an idempotent session per source scan', async () => {
    const session1 = await createMonitoringSession(db, 'scan1', scope1);
    expect(session1.id).toBeDefined();
    expect(session1.sourceScanId).toBe('scan1');
    expect(session1.sourceCreatedAt).toBe(sourceCreatedAt);

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

  it('derives scheduled dates from the persisted source scan rather than a caller timestamp', async () => {
    // A legacy caller value must not replace the immutable persisted baseline.
    const session = await createMonitoringSession(db, 'scan1', scope1, 0);
    
    const cp5 = db.get<{ scheduled_date: number; completed_date: number | null }>(
      'SELECT scheduled_date, completed_date FROM monitoring_checkpoint WHERE session_id = ? AND day_number = 5',
      [session.id]
    );
    expect(cp5?.scheduled_date).toBe(sourceCreatedAt + 4 * 24 * 60 * 60 * 1000);
    expect(cp5?.completed_date).toBeNull();

    const cp10 = db.get<{ scheduled_date: number }>(
      'SELECT scheduled_date FROM monitoring_checkpoint WHERE session_id = ? AND day_number = 10',
      [session.id],
    );
    expect(cp10?.scheduled_date).toBe(sourceCreatedAt + 9 * 24 * 60 * 60 * 1000);
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
    expect(user1Sessions.length).toBe(2);
    

    const unownedSessions = await listMonitoringSessions(db, unownedScope);
    expect(unownedSessions.length).toBe(1);
    expect(unownedSessions[0].sourceScanId).toBe('scan2');
    
    // Cross scope access fails
    await expect(getMonitoringSessionForScan(db, 'scan1', unownedScope)).resolves.toBeNull();
  });

  it('rejects a missing, deleted, or cross-account source scan before creating a session', async () => {
    await expect(createMonitoringSession(db, 'missing', scope1)).rejects.toThrow('Source scan not found or access denied');

    db.exec("INSERT INTO scan (uuid, image_uri, created_at, account_id) VALUES ('scan-other', 'uri', '2026-09-01T00:00:00Z', 'user2')");
    await expect(createMonitoringSession(db, 'scan-other', scope1)).rejects.toThrow('Source scan not found or access denied');

    db.exec("UPDATE scan SET deleted_at = '2026-09-02T00:00:00Z' WHERE uuid = 'scan1'");
    await expect(createMonitoringSession(db, 'scan1', scope1)).rejects.toThrow('Source scan not found or access denied');
    expect(db.get('SELECT id FROM monitoring_session WHERE source_scan_id = ?', ['scan1'])).toBeUndefined();
  });

  it('schema-enforces one anonymous session per source scan despite SQLite NULL semantics', async () => {
    const first = await createMonitoringSession(db, 'scan2', unownedScope);
    expect(first.sourceScanId).toBe('scan2');
    expect(() => db.exec(`
      INSERT INTO monitoring_session (id, source_scan_id, account_id, created_at)
      VALUES ('duplicate-anonymous', 'scan2', NULL, 1)
    `)).toThrow();
  });

  it('revalidates source ownership after an anonymous scan is claimed by an account', async () => {
    const anonymousSession = await createMonitoringSession(db, 'scan2', unownedScope);
    expect(claimUnownedScans(db, 'user1')).toBe(1);

    // The stale NULL session row never grants anonymous access to the now-owned
    // source scan or its checkpoint facts.
    await expect(getMonitoringSession(db, anonymousSession.id, unownedScope)).resolves.toBeNull();
    await expect(getMonitoringSessionForScan(db, 'scan2', unownedScope)).resolves.toBeNull();
    await expect(
      completeCheckpoint(db, anonymousSession.id, 5, { observation: 'better' }, unownedScope),
    ).rejects.toThrow('Monitoring session not found or access denied');

    // The account that owns the source scan can continue the existing local
    // monitoring lifecycle; it does not need a duplicate session.
    await expect(getMonitoringSession(db, anonymousSession.id, scope1)).resolves.not.toBeNull();
    const completed = await completeCheckpoint(db, anonymousSession.id, 5, { observation: 'better' }, scope1);
    expect(completed.checkpoints.find(checkpoint => checkpoint.dayNumber === 5)?.observation).toBe('better');
    await expect(listMonitoringSessions(db, unownedScope)).resolves.toEqual([]);
    await expect(listMonitoringSessions(db, scope1)).resolves.toHaveLength(1);
  });
});
