import { createTestDriver } from '../testing/betterSqliteDriver';
import { migrate, MIGRATIONS } from '../migrate';

test('creates the content and user tables', () => {
  const db = createTestDriver();
  migrate(db);
  const names = db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).map(r => r.name);
  for (const t of ['source', 'fruit', 'variety', 'scan', 'setting', 'schema_version', 'climate_history_cache']) {
    expect(names).toContain(t);
  }
});

test('reports the resulting schema version', () => {
  const db = createTestDriver();
  expect(migrate(db)).toBe(9);
});

test('is idempotent', () => {
  const db = createTestDriver();
  migrate(db);
  expect(() => migrate(db)).not.toThrow();
  expect(migrate(db)).toBe(9);
});

test('adds lat/lon to scan, idempotently', () => {
  const db = createTestDriver();
  migrate(db);
  expect(() => migrate(db)).not.toThrow();

  const columns = db.all<{ name: string }>('PRAGMA table_info(scan)').map(c => c.name);
  expect(columns).toContain('lat');
  expect(columns).toContain('lon');
});

test('rejects a variety whose fruit does not exist', () => {
  const db = createTestDriver();
  migrate(db);
  db.exec('PRAGMA foreign_keys = ON');
  expect(() =>
    db.exec("INSERT INTO variety (key, fruit_key, name_en, name_fil, is_ml_class) VALUES ('x','nope','X','X',1)")
  ).toThrow();
});

test('migrates to version 3 and creates the conversation tables', () => {
  const db = createTestDriver();
  const version = migrate(db);
  expect(version).toBe(9);

  db.exec("INSERT INTO conversation (uuid, title, device_id, created_at, updated_at) VALUES ('c1', 'Hello', 'dev-1', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z')");
  db.exec("INSERT INTO conversation_message (uuid, conversation_id, role, text, created_at) VALUES ('m1', 'c1', 'user', 'hi', '2026-08-30T00:00:01.000Z')");

  const row = db.get<{ title: string }>('SELECT title FROM conversation WHERE uuid = ?', ['c1']);
  expect(row?.title).toBe('Hello');
  const msg = db.get<{ text: string }>('SELECT text FROM conversation_message WHERE uuid = ?', ['m1']);
  expect(msg?.text).toBe('hi');
});

test('conversation_message.role rejects anything but user or assistant', () => {
  const db = createTestDriver();
  migrate(db);
  db.exec("INSERT INTO conversation (uuid, title, device_id, created_at, updated_at) VALUES ('c1', 'Hello', 'dev-1', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z')");
  expect(() =>
    db.exec("INSERT INTO conversation_message (uuid, conversation_id, role, text, created_at) VALUES ('m1', 'c1', 'system', 'x', '2026-08-30T00:00:01.000Z')"),
  ).toThrow();
});

test('deleting a conversation cascades to its messages', () => {
  const db = createTestDriver();
  migrate(db);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec("INSERT INTO conversation (uuid, title, device_id, created_at, updated_at) VALUES ('c1', 'Hello', 'dev-1', '2026-08-30T00:00:00.000Z', '2026-08-30T00:00:00.000Z')");
  db.exec("INSERT INTO conversation_message (uuid, conversation_id, role, text, created_at) VALUES ('m1', 'c1', 'user', 'hi', '2026-08-30T00:00:01.000Z')");
  db.exec("DELETE FROM conversation WHERE uuid = 'c1'");
  const msg = db.get('SELECT uuid FROM conversation_message WHERE uuid = ?', ['m1']);
  expect(msg).toBeUndefined();
});

test('a failing migration leaves neither its schema mutation nor version row', () => {
  const db = createTestDriver();
  migrate(db);
  
  const badMigrations = [
    { version: 10, sql: 'CREATE TABLE dummy (id INTEGER); INSERT INTO non_existent_table VALUES (1);' }
  ];
  
  expect(() => migrate(db, badMigrations)).toThrow();
  
  // Table dummy should not exist
  const names = db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).map(r => r.name);
  expect(names).not.toContain('dummy');
  
  // A failed version 10 migration must leave the completed version 9 state intact.
  const row = db.get<{ version: number }>('SELECT MAX(version) AS version FROM schema_version');
  expect(row?.version).toBe(9);
});

test('migration 006 upgrades schema v5, preserves rows and photos, backfills metadata and creates indexes', () => {
  const db = createTestDriver();

  // Apply migrations 1 through 5 only
  const v5Migrations = MIGRATIONS.filter(m => m.version <= 5);
  expect(migrate(db, v5Migrations)).toBe(5);

  // Seed rows as they exist under schema v5
  db.exec(`
    INSERT INTO scan (uuid, image_uri, created_at, synced_at, is_owned_photo)
    VALUES ('s_synced', 'file:///photos/p1.jpg', '2026-08-01T00:00:00.000Z', '2026-08-01T01:00:00.000Z', 1);

    INSERT INTO scan (uuid, image_uri, created_at, synced_at, is_owned_photo)
    VALUES ('s_pending', 'file:///photos/p2.jpg', '2026-08-02T00:00:00.000Z', NULL, 0);

    INSERT INTO conversation (uuid, title, device_id, created_at, updated_at, synced_at)
    VALUES ('c_synced', 'Chat Synced', 'd1', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', '2026-08-01T01:00:00.000Z');

    INSERT INTO conversation (uuid, title, device_id, created_at, updated_at, synced_at)
    VALUES ('c_pending', 'Chat Pending', 'd1', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z', NULL);

    INSERT INTO conversation_message (uuid, conversation_id, role, text, created_at, synced_at)
    VALUES ('m_synced', 'c_synced', 'user', 'hello', '2026-08-01T00:00:00.000Z', '2026-08-01T01:00:00.000Z');

    INSERT INTO conversation_message (uuid, conversation_id, role, text, created_at, synced_at)
    VALUES ('m_pending', 'c_pending', 'user', 'world', '2026-08-02T00:00:00.000Z', NULL);
  `);

  // Now run full migration up to v6
  const finalVersion = migrate(db);
  expect(finalVersion).toBe(9);

  // Verify scan table columns & backfill
  const scanCols = db.all<{ name: string }>('PRAGMA table_info(scan)').map(c => c.name);
  expect(scanCols).toContain('account_id');
  expect(scanCols).toContain('updated_at');
  expect(scanCols).toContain('sync_status');
  expect(scanCols).toContain('sync_error_code');
  expect(scanCols).toContain('retry_count');
  expect(scanCols).toContain('next_retry_at');

  const sSynced = db.get<{
    uuid: string; image_uri: string; updated_at: string; sync_status: string; account_id: string | null; is_owned_photo: number;
  }>('SELECT uuid, image_uri, updated_at, sync_status, account_id, is_owned_photo FROM scan WHERE uuid = ?', ['s_synced']);
  expect(sSynced?.image_uri).toBe('file:///photos/p1.jpg');
  expect(sSynced?.is_owned_photo).toBe(1);
  expect(sSynced?.updated_at).toBe('2026-08-01T00:00:00.000Z');
  expect(sSynced?.sync_status).toBe('synced');
  expect(sSynced?.account_id).toBeNull();

  const sPending = db.get<{
    uuid: string; image_uri: string; updated_at: string; sync_status: string; account_id: string | null;
  }>('SELECT uuid, image_uri, updated_at, sync_status, account_id FROM scan WHERE uuid = ?', ['s_pending']);
  expect(sPending?.image_uri).toBe('file:///photos/p2.jpg');
  expect(sPending?.updated_at).toBe('2026-08-02T00:00:00.000Z');
  expect(sPending?.sync_status).toBe('pending');
  expect(sPending?.account_id).toBeNull();

  // Verify conversation backfill
  const cSynced = db.get<{ sync_status: string; account_id: string | null }>(
    'SELECT sync_status, account_id FROM conversation WHERE uuid = ?', ['c_synced']
  );
  expect(cSynced?.sync_status).toBe('synced');
  expect(cSynced?.account_id).toBeNull();

  const cPending = db.get<{ sync_status: string; account_id: string | null }>(
    'SELECT sync_status, account_id FROM conversation WHERE uuid = ?', ['c_pending']
  );
  expect(cPending?.sync_status).toBe('pending');
  expect(cPending?.account_id).toBeNull();

  // Verify message backfill
  const mSynced = db.get<{ updated_at: string; sync_status: string; account_id: string | null }>(
    'SELECT updated_at, sync_status, account_id FROM conversation_message WHERE uuid = ?', ['m_synced']
  );
  expect(mSynced?.updated_at).toBe('2026-08-01T00:00:00.000Z');
  expect(mSynced?.sync_status).toBe('synced');
  expect(mSynced?.account_id).toBeNull();

  const mPending = db.get<{ updated_at: string; sync_status: string; account_id: string | null }>(
    'SELECT updated_at, sync_status, account_id FROM conversation_message WHERE uuid = ?', ['m_pending']
  );
  expect(mPending?.updated_at).toBe('2026-08-02T00:00:00.000Z');
  expect(mPending?.sync_status).toBe('pending');
  expect(mPending?.account_id).toBeNull();

  // Verify sync_status check constraints
  expect(() =>
    db.exec("INSERT INTO scan (uuid, image_uri, created_at, sync_status) VALUES ('bad_s', 'uri', '2026-08-01', 'invalid')")
  ).toThrow();
  expect(() =>
    db.exec("INSERT INTO conversation (uuid, title, device_id, created_at, updated_at, sync_status) VALUES ('bad_c', 't', 'd', '2026-08-01', '2026-08-01', 'invalid')")
  ).toThrow();
  expect(() =>
    db.exec("INSERT INTO conversation_message (uuid, conversation_id, role, text, created_at, sync_status) VALUES ('bad_m', 'c_synced', 'user', 'hi', '2026-08-01', 'invalid')")
  ).toThrow();

  // Verify indexes exist
  const indexNames = db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='index'"
  ).map(r => r.name);
  expect(indexNames).toContain('idx_scan_account_created');
  expect(indexNames).toContain('idx_scan_account_sync');
  expect(indexNames).toContain('idx_conversation_account_updated');
  expect(indexNames).toContain('idx_conversation_account_sync');
  expect(indexNames).toContain('idx_conversation_message_account_sync');
});

test('migration 007 creates monitoring tables, migration 008 fixes anonymous uniqueness, and a failed monitoring migration rolls back', () => {
  const db = createTestDriver();
  const v6Migrations = MIGRATIONS.filter(m => m.version <= 6);
  migrate(db, v6Migrations);

  const badV7 = [
    ...v6Migrations,
    { version: 7, sql: 'CREATE TABLE monitoring_session (id TEXT); INSERT INTO dummy_non_existent VALUES (1);' }
  ];
  expect(() => migrate(db, badV7)).toThrow();
  let names = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name);
  expect(names).not.toContain('monitoring_session');

  migrate(db); // Runs the real v7 schema followed by the v8 uniqueness fix.
  names = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name);
  expect(names).toContain('monitoring_session');
  expect(names).toContain('monitoring_checkpoint');

  const sessionCols = db.all<{ name: string }>('PRAGMA table_info(monitoring_session)').map(c => c.name);
  const checkpointCols = db.all<{ name: string }>('PRAGMA table_info(monitoring_checkpoint)').map(c => c.name);
  const allCols = [...sessionCols, ...checkpointCols];

  const prohibited = ['diagnosis', 'disease', 'severity', 'percentage', 'confidence', 'trend'];
  for (const p of prohibited) {
    expect(allCols).not.toContain(p);
  }

  db.exec("INSERT INTO scan (uuid, image_uri, created_at) VALUES ('anonymous-scan', 'file:///photo.jpg', '2026-09-01T00:00:00.000Z')");
  db.exec("INSERT INTO monitoring_session (id, source_scan_id, account_id, created_at) VALUES ('anonymous-first', 'anonymous-scan', NULL, 1)");
  expect(() => db.exec("INSERT INTO monitoring_session (id, source_scan_id, account_id, created_at) VALUES ('anonymous-second', 'anonymous-scan', NULL, 2)")).toThrow();
});

test('migration 008 deterministically repairs duplicate anonymous v7 sessions before adding its unique index', () => {
  const db = createTestDriver();
  migrate(db, MIGRATIONS.filter(m => m.version <= 7));
  db.exec(`
    INSERT INTO scan (uuid, image_uri, created_at) VALUES ('legacy-anonymous-scan', 'file:///photo.jpg', '2026-09-01T00:00:00.000Z');
    INSERT INTO monitoring_session (id, source_scan_id, account_id, created_at) VALUES ('session-early', 'legacy-anonymous-scan', NULL, 10);
    INSERT INTO monitoring_session (id, source_scan_id, account_id, created_at) VALUES ('session-late', 'legacy-anonymous-scan', NULL, 20);
    INSERT INTO monitoring_checkpoint (id, session_id, day_number, scheduled_date) VALUES ('early-day-5', 'session-early', 5, 100);
    INSERT INTO monitoring_checkpoint (id, session_id, day_number, scheduled_date, completed_date, observation, note)
      VALUES ('late-day-5', 'session-late', 5, 100, 150, 'better', 'Recorded observation');
    INSERT INTO monitoring_checkpoint (id, session_id, day_number, scheduled_date) VALUES ('late-day-10', 'session-late', 10, 200);
  `);

  expect(migrate(db)).toBe(9);
  const sessions = db.all<{ id: string }>(
    "SELECT id FROM monitoring_session WHERE source_scan_id = 'legacy-anonymous-scan'",
  );
  expect(sessions).toEqual([{ id: 'session-early' }]);

  const checkpoints = db.all<{ id: string; session_id: string; day_number: number; observation: string | null }>(
    "SELECT id, session_id, day_number, observation FROM monitoring_checkpoint WHERE session_id = 'session-early' ORDER BY day_number",
  );
  expect(checkpoints).toEqual([
    { id: 'late-day-5', session_id: 'session-early', day_number: 5, observation: 'better' },
    { id: 'late-day-10', session_id: 'session-early', day_number: 10, observation: null },
  ]);
  expect(() => db.exec("INSERT INTO monitoring_session (id, source_scan_id, account_id, created_at) VALUES ('still-duplicate', 'legacy-anonymous-scan', NULL, 30)")).toThrow();
});
