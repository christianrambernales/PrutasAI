import { createTestDriver } from '../testing/betterSqliteDriver';
import { migrate } from '../migrate';

test('creates the content and user tables', () => {
  const db = createTestDriver();
  migrate(db);
  const names = db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).map(r => r.name);
  for (const t of ['source', 'fruit', 'variety', 'scan', 'setting', 'schema_version']) {
    expect(names).toContain(t);
  }
});

test('reports the resulting schema version', () => {
  const db = createTestDriver();
  expect(migrate(db)).toBe(3);
});

test('is idempotent', () => {
  const db = createTestDriver();
  migrate(db);
  expect(() => migrate(db)).not.toThrow();
  expect(migrate(db)).toBe(3);
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
  expect(version).toBe(3);

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
