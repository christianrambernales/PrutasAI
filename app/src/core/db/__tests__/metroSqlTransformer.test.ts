/**
 * Guards the bundler's `.sql` handling.
 *
 * Jest transforms `.sql` through src/core/db/testing/sqlTransform.js, so the
 * whole suite passed while Metro — the real bundler — could not build the app
 * at all: `metro.config.js` listed `sql` in `sourceExts` but nothing turned the
 * text into a module, so Metro handed `CREATE TABLE ...` to the JavaScript
 * parser and got "Missing semicolon".
 *
 * It only surfaced when the SQLite layer made seed.sql a runtime import. These
 * tests assert both halves are still wired: the conversion works, and the
 * config still points at it.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sqlToModule } = require('../../../../metro-sql-transformer.js');

const APP_ROOT = join(__dirname, '..', '..', '..', '..');

function evaluate(generated: string): unknown {
  const module = { exports: {} as unknown };
  // eslint-disable-next-line no-new-func
  new Function('module', generated)(module);
  return module.exports;
}

test('SQL becomes a module exporting the SQL as a string', () => {
  const sql = "CREATE TABLE fruit (key TEXT PRIMARY KEY);\nINSERT INTO fruit VALUES ('banana');";
  expect(evaluate(sqlToModule(sql))).toBe(sql);
});

test('quotes, newlines and backslashes survive intact', () => {
  const sql = `SELECT 'it''s' AS x, "quoted" AS y;\n-- back\\slash`;
  expect(evaluate(sqlToModule(sql))).toBe(sql);
});

test('a backtick or template placeholder cannot break out of the module', () => {
  // A template literal would have been escaped by this; JSON.stringify is not.
  const hostile = 'SELECT `${process.env.SECRET}` AS x;';
  expect(evaluate(sqlToModule(hostile))).toBe(hostile);
});

test('the real seed file round-trips', () => {
  const seed = readFileSync(join(APP_ROOT, 'src/core/db/seed.sql'), 'utf8');
  expect(evaluate(sqlToModule(seed))).toBe(seed);
});

test('metro.config.js still points at the transformer', () => {
  const config = readFileSync(join(APP_ROOT, 'metro.config.js'), 'utf8');
  // Both halves are required. sourceExts alone is the bug.
  expect(config).toContain("sourceExts.push('sql')");
  expect(config).toContain('babelTransformerPath');
  expect(config).toContain('metro-sql-transformer');
});

test('metro resolves .wasm, which expo-sqlite needs on web', () => {
  // expo-sqlite runs SQLite as WebAssembly in a browser and imports the .wasm
  // directly. Metro resolves neither extension by default, so dropping this
  // line breaks the web build — and web is a deployment target, not just a
  // preview.
  const config = readFileSync(join(APP_ROOT, 'metro.config.js'), 'utf8');
  expect(config).toContain("assetExts.push('wasm')");
});
