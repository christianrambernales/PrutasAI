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
  expect(migrate(db)).toBe(1);
});

test('is idempotent', () => {
  const db = createTestDriver();
  migrate(db);
  expect(() => migrate(db)).not.toThrow();
  expect(migrate(db)).toBe(1);
});

test('rejects a variety whose fruit does not exist', () => {
  const db = createTestDriver();
  migrate(db);
  db.exec('PRAGMA foreign_keys = ON');
  expect(() =>
    db.exec("INSERT INTO variety (key, fruit_key, name_en, name_fil, is_ml_class) VALUES ('x','nope','X','X',1)")
  ).toThrow();
});
