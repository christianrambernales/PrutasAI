import { createTestDriver } from '../testing/betterSqliteDriver';
import { migrate } from '../migrate';
import { seedContent } from '../seed';

const SQL = `BEGIN TRANSACTION;
DELETE FROM variety; DELETE FROM fruit;
INSERT INTO fruit (key,name_en,name_fil,emoji,ml_class_index) VALUES ('banana','Banana','Saging','B',0);
INSERT INTO variety (key,fruit_key,name_en,name_fil,ml_class_index,is_ml_class) VALUES ('lakatan','banana','Lakatan','Lakatan',0,1);
INSERT OR REPLACE INTO setting (key,value) VALUES ('content_version','1.0');
COMMIT;`;

test('seeds content on a fresh database', () => {
  const db = createTestDriver();
  migrate(db);
  expect(seedContent(db, SQL, '1.0')).toBe(true);
  expect(db.all('SELECT * FROM fruit')).toHaveLength(1);
});

test('skips reseeding when content_version is unchanged', () => {
  const db = createTestDriver();
  migrate(db);
  seedContent(db, SQL, '1.0');
  expect(seedContent(db, SQL, '1.0')).toBe(false);
});

test('reseeds when content_version changes', () => {
  const db = createTestDriver();
  migrate(db);
  seedContent(db, SQL, '1.0');
  expect(seedContent(db, SQL.replace("'1.0'", "'2.0'"), '2.0')).toBe(true);
});

test('reseeding preserves user tables', () => {
  const db = createTestDriver();
  migrate(db);
  seedContent(db, SQL, '1.0');
  db.exec("INSERT INTO scan (uuid,image_uri,created_at) VALUES ('u1','file://a','2026-01-01')");
  seedContent(db, SQL.replace("'1.0'", "'2.0'"), '2.0');
  expect(db.all('SELECT * FROM scan')).toHaveLength(1);
});
