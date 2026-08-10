# PrutasAI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the PrutasAI Thesis 2 foundation — knowledge base, local database, model
registry, and Android packaging — ending in a sideloadable `.apk` that installs and runs
correctly with zero model weights present.

**Architecture:** An Expo React Native app owns everything; there is no server in this plan. All
agricultural and taxonomic facts live in versioned YAML under `knowledge/`, which a Node script
compiles into a SQLite seed, an ML class map, and TypeScript types. The database layer sits
behind a driver interface so migrations, seeding, and repositories are unit-testable in plain
Node against `better-sqlite3`, while the app uses `expo-sqlite`. The model registry reads
`models/manifest.json` and reports per-model status without performing any inference — inference
arrives in the next plan.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, expo-sqlite, better-sqlite3 (tests only),
Jest with jest-expo, node:test for build scripts, yaml, EAS Build.

## Global Constraints

- All work happens on the `final` branch. The `prototype` branch is never modified.
- Supported fruits are exactly `banana`, `mango`, `papaya`. `orange` and `capsicum` appear
  nowhere in new code.
- The fruit and variety taxonomy has exactly one source of truth: `knowledge/taxonomy.yaml`.
  No fruit or variety name is hardcoded in TypeScript, SQL, or Python.
- Every content row carries a `source_id` resolving to an entry in `knowledge/sources.yaml`.
  The compiler fails the build on a dangling reference.
- No secret, credential, or absolute machine path appears in any tracked file.
- The app must build, install, and run with `models/` empty. This is the current project state
  and a first-class tested case, not a fallback.
- Nothing may fabricate a detection, a measurement, or an agricultural fact. A missing input
  produces an explicit "unavailable" state.
- Coordinates, when they exist in later plans, are rounded to 2 decimal places before storage.
- Package versions are resolved by `npx expo install`, never pinned by hand.

---

### Task 1: Restructure the repository and scaffold the app

**Files:**
- Create: `app/` (Expo TypeScript project), `app/App.tsx`, `app/metro.config.js`,
  `app/src/ui/i18n/en.json`, `app/src/ui/i18n/fil.json`, `app/src/ui/theme.ts`
- Create: `package.json` (root), `.gitignore` (modify)
- Delete: `backend/`, `mobile/`, `ml-model/`

**Interfaces:**
- Consumes: nothing.
- Produces: an `app/` Expo project that boots; root npm scripts `compile:knowledge`,
  `sync:models`, `test:scripts` (defined in later tasks but registered here).

- [ ] **Step 1: Confirm you are on the `final` branch**

```bash
git branch --show-current   # must print: final
```

If it prints anything else, stop and run `git checkout final`. Do not proceed on `main` or
`prototype`.

- [ ] **Step 2: Salvage the three assets worth keeping, before deleting anything**

```bash
mkdir -p /tmp/prutasai-salvage
cp mobile/src/i18n/en.json mobile/src/i18n/fil.json /tmp/prutasai-salvage/
cp mobile/src/utils/theme.js /tmp/prutasai-salvage/
```

Everything else in `mobile/`, `backend/`, and `ml-model/` is superseded. It remains available
forever via `git show prototype:<path>`.

- [ ] **Step 3: Delete the prototype trees**

```bash
git rm -r --quiet backend mobile ml-model
```

- [ ] **Step 4: Scaffold the Expo app**

```bash
npx create-expo-app@latest app --template blank-typescript
```

- [ ] **Step 5: Restore the salvaged assets into the new structure**

```bash
mkdir -p app/src/ui/i18n
cp /tmp/prutasai-salvage/en.json /tmp/prutasai-salvage/fil.json app/src/ui/i18n/
cp /tmp/prutasai-salvage/theme.js app/src/ui/theme.ts
```

`theme.js` is plain object exports, so it compiles as TypeScript unchanged except for one
deletion. Open `app/src/ui/theme.ts` and **delete the entire `FRUIT_EMOJI` export** — emoji move
into `knowledge/taxonomy.yaml` in Task 2, and leaving a copy here reintroduces the exact
duplication this rebuild exists to remove. Then append `as const` to each remaining export so
the token values narrow to literals:

```ts
export const COLORS = { /* ...existing values, unchanged... */ } as const;
export const SPACING = { /* ...existing values, unchanged... */ } as const;
export const RADIUS  = { /* ...existing values, unchanged... */ } as const;
export const FONTS   = { /* ...existing values, unchanged... */ } as const;
export const SHADOWS = { /* ...existing values, unchanged... */ } as const;
```

Verify it compiles: `npx tsc --noEmit --project app`.

- [ ] **Step 6: Teach Metro to treat `.tflite` files as assets**

Without this, `require()` of a model file fails at bundle time. Create `app/metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('tflite');

module.exports = config;
```

- [ ] **Step 7: Create the root package.json**

This holds the build scripts that operate across `knowledge/`, `models/`, and `app/`.

```json
{
  "name": "prutasai",
  "private": true,
  "type": "module",
  "scripts": {
    "compile:knowledge": "node scripts/compile-knowledge.mjs",
    "sync:models": "node scripts/sync-models.mjs",
    "test:scripts": "node --test scripts/",
    "test:app": "npm --prefix app test",
    "test": "npm run test:scripts && npm run test:app"
  },
  "devDependencies": {
    "yaml": "^2.6.0"
  }
}
```

```bash
npm install
```

- [ ] **Step 8: Extend .gitignore for generated artifacts**

Append to the root `.gitignore`:

```
# Generated build artifacts
app/assets/models/
app/src/core/ml/bundledModels.ts
app/src/core/db/seed.sql
app/src/core/types/knowledge.ts
ml/classes.json

# Android build output
app/android/
app/ios/
*.keystore
*.jks
```

Model weights are already covered by the existing `*.pt` rule; add `*.tflite` beneath it.

- [ ] **Step 9: Verify the app boots**

```bash
npm --prefix app start
```

Expected: Metro starts and prints a QR code without error. Press `Ctrl+C` to stop. You are not
running it on a device yet — Task 6 handles that.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: replace prototype trees with Expo TypeScript app scaffold

Removes the Node/Express backend, Flask ML service, and Expo Go mobile
app. All three remain available on the prototype branch.

Ported: EN/FIL i18n strings and theme tokens. The FRUIT_EMOJI map is
deliberately not ported; emoji move into knowledge/taxonomy.yaml so the
fruit list has a single source of truth.

Metro is configured to bundle .tflite as assets, required for the model
registry in a later task."
```

---

### Task 2: Knowledge base and compiler

**Files:**
- Create: `knowledge/sources.yaml`, `knowledge/taxonomy.yaml`
- Create: `scripts/compile-knowledge.mjs`
- Test: `scripts/compile-knowledge.test.mjs`

**Interfaces:**
- Consumes: root `package.json` scripts from Task 1.
- Produces: `compileKnowledge(knowledgeDir)` returning
  `{ fruits, varieties, sources, contentVersion }`; writes `app/src/core/db/seed.sql`,
  `ml/classes.json`, and `app/src/core/types/knowledge.ts`. Task 3 consumes `seed.sql`; Task 5
  consumes `ml/classes.json`.

- [ ] **Step 1: Write `knowledge/sources.yaml`**

Only the sources actually used by this task's taxonomy. Diseases, remedies, and crop
requirements arrive in later plans with their own entries.

```yaml
sources:
  - id: pcaarrd_banana
    citation: "PCAARRD-DOST. Improved Lakatan and Cavendish varieties through S&T."
    url: "https://www.pcaarrd.dost.gov.ph/index.php/quick-information-dispatch-qid-articles/improved-lakatan-and-cavendish-varieties-through-s-t"
    retrieved_at: "2026-08-10"
  - id: pcaarrd_mango_isp
    citation: "PCAARRD-DOST. Mango — Industry Strategic Science and Technology Plans."
    url: "https://ispweb.pcaarrd.dost.gov.ph/isp-commodities/mango/"
    retrieved_at: "2026-08-10"
  - id: uplb_sinta
    citation: "UPLB Institute of Plant Breeding. Sinta papaya, the super breed."
    url: "https://horizon.uplb.edu.ph/horizon-magazine-2022/sinta-papaya-the-super-breed/"
    retrieved_at: "2026-08-10"
  - id: da_mango_varieties
    citation: "Department of Agriculture. 9 new varieties that will strengthen the Philippine mango industry."
    url: "https://www.da.gov.ph/from-manila-bulletin-9-new-varieties-that-will-strengthen-the-philippine-mango-industry/"
    retrieved_at: "2026-08-10"
```

- [ ] **Step 2: Write `knowledge/taxonomy.yaml`**

Note `is_ml_class: false` on the Carabao strains. They are clonal selections that no camera can
separate, so they exist as information but never as classifier outputs.

```yaml
content_version: "2026.08.10"
fruits:
  - key: banana
    name: { en: Banana, fil: Saging }
    emoji: "🍌"
    ml_class_index: 0
    varieties:
      - { key: lakatan,  name: { en: Lakatan,  fil: Lakatan  }, ml_class_index: 0, is_ml_class: true, sources: [pcaarrd_banana] }
      - { key: latundan, name: { en: Latundan, fil: Latundan }, ml_class_index: 1, is_ml_class: true, sources: [pcaarrd_banana] }
      - { key: saba,     name: { en: Saba,     fil: Saba     }, ml_class_index: 2, is_ml_class: true, sources: [pcaarrd_banana] }
      - { key: cavendish,name: { en: Cavendish,fil: Cavendish}, ml_class_index: 3, is_ml_class: true, sources: [pcaarrd_banana] }
  - key: mango
    name: { en: Mango, fil: Mangga }
    emoji: "🥭"
    ml_class_index: 1
    varieties:
      - { key: carabao,    name: { en: Carabao,           fil: Carabao }, ml_class_index: 0, is_ml_class: true, sources: [pcaarrd_mango_isp] }
      - { key: pico,       name: { en: Pico,              fil: Piko    }, ml_class_index: 1, is_ml_class: true, sources: [pcaarrd_mango_isp] }
      - { key: katchamita, name: { en: Katchamita (Indian), fil: Indian }, ml_class_index: 2, is_ml_class: true, sources: [pcaarrd_mango_isp] }
      - { key: mmsu_gold,  name: { en: MMSU Gold,   fil: MMSU Gold   }, is_ml_class: false, parent: carabao, sources: [da_mango_varieties] }
      - { key: sweet_elena,name: { en: Sweet Elena, fil: Sweet Elena }, is_ml_class: false, parent: carabao, sources: [da_mango_varieties] }
  - key: papaya
    name: { en: Papaya, fil: Papaya }
    emoji: "🫒"
    ml_class_index: 2
    varieties:
      - { key: solo,           name: { en: Solo,           fil: Solo           }, ml_class_index: 0, is_ml_class: true, sources: [uplb_sinta] }
      - { key: cavite_special, name: { en: Cavite Special, fil: Cavite Special }, ml_class_index: 1, is_ml_class: true, sources: [uplb_sinta] }
      - { key: red_lady,       name: { en: Red Lady,       fil: Red Lady       }, ml_class_index: 2, is_ml_class: true, sources: [uplb_sinta] }
      - { key: sinta,          name: { en: Sinta,          fil: Sinta          }, ml_class_index: 3, is_ml_class: true, sources: [uplb_sinta] }
```

- [ ] **Step 3: Write the failing tests**

Create `scripts/compile-knowledge.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileKnowledge, KnowledgeError } from './compile-knowledge.mjs';

const dir = new URL('../knowledge/', import.meta.url).pathname;

test('loads all three fruits with global class indices', () => {
  const k = compileKnowledge(dir);
  assert.deepEqual(k.fruits.map(f => f.key), ['banana', 'mango', 'papaya']);
  assert.deepEqual(k.fruits.map(f => f.ml_class_index), [0, 1, 2]);
});

test('excludes non-ml-class varieties from the class map', () => {
  const k = compileKnowledge(dir);
  const mango = k.classMap.varieties.mango;
  assert.deepEqual(mango, ['carabao', 'pico', 'katchamita']);
  assert.ok(!mango.includes('mmsu_gold'), 'clonal strains must not be classifier outputs');
});

test('keeps non-ml-class varieties as information rows with a parent', () => {
  const k = compileKnowledge(dir);
  const gold = k.varieties.find(v => v.key === 'mmsu_gold');
  assert.equal(gold.is_ml_class, false);
  assert.equal(gold.parent, 'carabao');
});

test('variety class indices are scoped per fruit, not global', () => {
  const k = compileKnowledge(dir);
  const lakatan = k.varieties.find(v => v.key === 'lakatan');
  const carabao = k.varieties.find(v => v.key === 'carabao');
  assert.equal(lakatan.ml_class_index, 0);
  assert.equal(carabao.ml_class_index, 0);
});

test('rejects a dangling source reference', () => {
  assert.throws(
    () => compileKnowledge(dir, {
      taxonomyOverride: {
        content_version: '1',
        fruits: [{
          key: 'banana', name: { en: 'Banana', fil: 'Saging' }, emoji: '🍌', ml_class_index: 0,
          varieties: [{ key: 'lakatan', name: { en: 'L', fil: 'L' }, ml_class_index: 0, is_ml_class: true, sources: ['does_not_exist'] }],
        }],
      },
    }),
    KnowledgeError,
  );
});

test('rejects non-contiguous class indices', () => {
  assert.throws(
    () => compileKnowledge(dir, {
      taxonomyOverride: {
        content_version: '1',
        fruits: [{
          key: 'banana', name: { en: 'Banana', fil: 'Saging' }, emoji: '🍌', ml_class_index: 0,
          varieties: [
            { key: 'a', name: { en: 'A', fil: 'A' }, ml_class_index: 0, is_ml_class: true, sources: ['pcaarrd_banana'] },
            { key: 'b', name: { en: 'B', fil: 'B' }, ml_class_index: 2, is_ml_class: true, sources: ['pcaarrd_banana'] },
          ],
        }],
      },
    }),
    KnowledgeError,
  );
});

test('emits SQL that inserts every fruit and variety', () => {
  const k = compileKnowledge(dir);
  assert.match(k.seedSql, /INSERT INTO fruit/);
  for (const v of k.varieties) {
    assert.ok(k.seedSql.includes(`'${v.key}'`), `missing variety ${v.key}`);
  }
});

test('escapes single quotes in emitted SQL', () => {
  const k = compileKnowledge(dir, {
    taxonomyOverride: {
      content_version: '1',
      fruits: [{
        key: 'banana', name: { en: "Farmer's Banana", fil: 'Saging' }, emoji: '🍌', ml_class_index: 0,
        varieties: [{ key: 'lakatan', name: { en: 'L', fil: 'L' }, ml_class_index: 0, is_ml_class: true, sources: ['pcaarrd_banana'] }],
      }],
    },
  });
  assert.ok(k.seedSql.includes("Farmer''s Banana"));
});
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
npm run test:scripts
```

Expected: FAIL — `Cannot find module './compile-knowledge.mjs'`.

- [ ] **Step 5: Write the compiler**

Create `scripts/compile-knowledge.mjs`:

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse } from 'yaml';

export class KnowledgeError extends Error {}

const sql = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

function assertContiguous(indices, label) {
  const sorted = [...indices].sort((a, b) => a - b);
  sorted.forEach((n, i) => {
    if (n !== i) throw new KnowledgeError(`${label}: class indices must be contiguous from 0, got [${sorted}]`);
  });
}

export function compileKnowledge(knowledgeDir, opts = {}) {
  const sources = parse(readFileSync(join(knowledgeDir, 'sources.yaml'), 'utf8')).sources;
  const taxonomy = opts.taxonomyOverride
    ?? parse(readFileSync(join(knowledgeDir, 'taxonomy.yaml'), 'utf8'));

  const sourceIds = new Set(sources.map(s => s.id));
  const fruits = taxonomy.fruits;
  const varieties = [];
  const classMap = { fruits: [], varieties: {} };

  assertContiguous(fruits.map(f => f.ml_class_index), 'fruits');
  classMap.fruits = [...fruits].sort((a, b) => a.ml_class_index - b.ml_class_index).map(f => f.key);

  for (const fruit of fruits) {
    const mlVarieties = fruit.varieties.filter(v => v.is_ml_class);
    assertContiguous(mlVarieties.map(v => v.ml_class_index), `${fruit.key} varieties`);
    classMap.varieties[fruit.key] = [...mlVarieties]
      .sort((a, b) => a.ml_class_index - b.ml_class_index)
      .map(v => v.key);

    for (const v of fruit.varieties) {
      for (const id of v.sources ?? []) {
        if (!sourceIds.has(id)) {
          throw new KnowledgeError(`variety '${v.key}' references unknown source '${id}'`);
        }
      }
      varieties.push({ ...v, fruit: fruit.key, is_ml_class: Boolean(v.is_ml_class), parent: v.parent ?? null });
    }
  }

  const lines = ['BEGIN TRANSACTION;', 'DELETE FROM variety;', 'DELETE FROM fruit;', 'DELETE FROM source;'];
  for (const s of sources) {
    lines.push(`INSERT INTO source (id, citation, url, retrieved_at) VALUES (${sql(s.id)}, ${sql(s.citation)}, ${sql(s.url)}, ${sql(s.retrieved_at)});`);
  }
  for (const f of fruits) {
    lines.push(`INSERT INTO fruit (key, name_en, name_fil, emoji, ml_class_index) VALUES (${sql(f.key)}, ${sql(f.name.en)}, ${sql(f.name.fil)}, ${sql(f.emoji)}, ${f.ml_class_index});`);
  }
  for (const v of varieties) {
    const idx = v.is_ml_class ? v.ml_class_index : 'NULL';
    lines.push(
      `INSERT INTO variety (key, fruit_key, name_en, name_fil, ml_class_index, is_ml_class, parent_key, source_id) ` +
      `VALUES (${sql(v.key)}, ${sql(v.fruit)}, ${sql(v.name.en)}, ${sql(v.name.fil)}, ${idx}, ${v.is_ml_class ? 1 : 0}, ${sql(v.parent)}, ${sql((v.sources ?? [])[0])});`
    );
  }
  lines.push(`INSERT OR REPLACE INTO setting (key, value) VALUES ('content_version', ${sql(taxonomy.content_version)});`);
  lines.push('COMMIT;');

  return { fruits, varieties, sources, classMap, contentVersion: taxonomy.content_version, seedSql: lines.join('\n') + '\n' };
}

function write(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, 'utf8');
  console.log(`wrote ${path}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = new URL('../', import.meta.url).pathname;
  const k = compileKnowledge(join(root, 'knowledge'));
  write(join(root, 'app/src/core/db/seed.sql'), k.seedSql);
  write(join(root, 'ml/classes.json'), JSON.stringify(k.classMap, null, 2) + '\n');
  write(join(root, 'app/src/core/types/knowledge.ts'),
    `// Generated by scripts/compile-knowledge.mjs. Do not edit.\n` +
    `export type FruitKey = ${k.fruits.map(f => `'${f.key}'`).join(' | ')};\n` +
    `export type VarietyKey = ${k.varieties.map(v => `'${v.key}'`).join(' | ')};\n` +
    `export const CONTENT_VERSION = '${k.contentVersion}';\n`);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm run test:scripts
```

Expected: PASS, 8 tests.

- [ ] **Step 7: Run the compiler and inspect its output**

```bash
npm run compile:knowledge
cat ml/classes.json
```

Expected: `fruits` lists banana, mango, papaya in index order; `varieties.mango` contains exactly
three entries with no `mmsu_gold`.

- [ ] **Step 8: Commit**

```bash
git add knowledge scripts package.json package-lock.json
git commit -m "feat: add knowledge base and compiler

knowledge/ becomes the single source of truth for the fruit and variety
taxonomy, replacing six hardcoded copies of the fruit list in the
prototype. The compiler emits a SQLite seed, an ML class map, and
TypeScript types.

Validation is enforced at build time: dangling source references and
non-contiguous class indices both fail the build. Clonal strains of
Carabao are carried as information rows with is_ml_class false, so they
never become classifier outputs."
```

---

### Task 3: Database driver, migrations, and seeding

**Files:**
- Create: `app/src/core/db/driver.ts`, `app/src/core/db/migrations/001_initial.sql`,
  `app/src/core/db/migrate.ts`, `app/src/core/db/seed.ts`
- Test: `app/src/core/db/__tests__/migrate.test.ts`, `app/src/core/db/__tests__/seed.test.ts`
- Create: `app/src/core/db/testing/betterSqliteDriver.ts`
- Modify: `app/package.json` (test script and jest config)

**Interfaces:**
- Consumes: `app/src/core/db/seed.sql` generated by Task 2.
- Produces: `interface SqlDriver { exec(sql: string): void; all<T>(sql: string, params?: unknown[]): T[]; get<T>(sql: string, params?: unknown[]): T | undefined; }`;
  `migrate(driver: SqlDriver): number` returning the resulting schema version;
  `seedContent(driver: SqlDriver, seedSql: string, contentVersion: string): boolean` returning
  whether a reseed occurred. Task 4 consumes `SqlDriver`.

- [ ] **Step 1: Install test dependencies**

```bash
npm --prefix app install --save-dev jest-expo jest @types/jest better-sqlite3 @types/better-sqlite3
```

Add to `app/package.json`:

```json
{
  "scripts": { "test": "jest" },
  "jest": { "preset": "jest-expo" }
}
```

- [ ] **Step 2: Write the driver interface and the test driver**

Create `app/src/core/db/driver.ts`:

```ts
export interface SqlDriver {
  exec(sql: string): void;
  all<T>(sql: string, params?: unknown[]): T[];
  get<T>(sql: string, params?: unknown[]): T | undefined;
}
```

Create `app/src/core/db/testing/betterSqliteDriver.ts`:

```ts
import Database from 'better-sqlite3';
import type { SqlDriver } from '../driver';

export function createTestDriver(): SqlDriver {
  const db = new Database(':memory:');
  return {
    exec: (sql) => { db.exec(sql); },
    all: <T>(sql: string, params: unknown[] = []) => db.prepare(sql).all(...params) as T[],
    get: <T>(sql: string, params: unknown[] = []) => db.prepare(sql).get(...params) as T | undefined,
  };
}
```

- [ ] **Step 3: Write the failing migration test**

Create `app/src/core/db/__tests__/migrate.test.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify it fails**

```bash
npm --prefix app test -- migrate
```

Expected: FAIL — cannot find module `../migrate`.

- [ ] **Step 5: Write the migration SQL**

Create `app/src/core/db/migrations/001_initial.sql`:

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version    INTEGER NOT NULL,
  applied_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS source (
  id           TEXT PRIMARY KEY,
  citation     TEXT NOT NULL,
  url          TEXT,
  retrieved_at TEXT
);

CREATE TABLE IF NOT EXISTS fruit (
  key            TEXT PRIMARY KEY,
  name_en        TEXT NOT NULL,
  name_fil       TEXT NOT NULL,
  emoji          TEXT,
  ml_class_index INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS variety (
  key            TEXT PRIMARY KEY,
  fruit_key      TEXT NOT NULL REFERENCES fruit(key),
  name_en        TEXT NOT NULL,
  name_fil       TEXT NOT NULL,
  ml_class_index INTEGER,
  is_ml_class    INTEGER NOT NULL DEFAULT 0,
  parent_key     TEXT REFERENCES variety(key),
  source_id      TEXT REFERENCES source(id)
);
CREATE INDEX IF NOT EXISTS idx_variety_fruit ON variety(fruit_key);

CREATE TABLE IF NOT EXISTS scan (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid             TEXT NOT NULL UNIQUE,
  image_uri        TEXT NOT NULL,
  fruit_key        TEXT REFERENCES fruit(key),
  fruit_conf       REAL,
  variety_key      TEXT REFERENCES variety(key),
  variety_conf     REAL,
  bbox_json        TEXT,
  manifest_version INTEGER,
  created_at       TEXT NOT NULL,
  synced_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_scan_created ON scan(created_at DESC);

CREATE TABLE IF NOT EXISTS setting (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

Disease, remedy, climate, chat and monitoring tables arrive with the plans that use them, each as
its own numbered migration. Creating them now would be unused schema.

- [ ] **Step 6: Write the migration runner**

Create `app/src/core/db/migrate.ts`:

```ts
import type { SqlDriver } from './driver';
import initial from './migrations/001_initial.sql';

const MIGRATIONS: { version: number; sql: string }[] = [{ version: 1, sql: initial }];

export function migrate(driver: SqlDriver): number {
  driver.exec(
    'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL, applied_at TEXT NOT NULL)'
  );
  const row = driver.get<{ version: number }>('SELECT MAX(version) AS version FROM schema_version');
  const current = row?.version ?? 0;

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    driver.exec(m.sql);
    driver.exec(
      `INSERT INTO schema_version (version, applied_at) VALUES (${m.version}, '${new Date().toISOString()}')`
    );
  }
  return MIGRATIONS[MIGRATIONS.length - 1].version;
}
```

Importing a `.sql` file as a string needs a Jest transform and a matching Metro rule, so the same
import works in tests and on the device.

Create `app/src/core/db/testing/sqlTransform.js`:

```js
module.exports = {
  process: (src) => ({ code: `module.exports = ${JSON.stringify(src)};` }),
};
```

Set the `jest` block in `app/package.json` to exactly this — note `transform`, not
`moduleNameMapper`; a mapper would swap the module for a stub rather than inline its text:

```json
"jest": {
  "preset": "jest-expo",
  "transform": {
    "\\.sql$": "<rootDir>/src/core/db/testing/sqlTransform.js",
    "\\.[jt]sx?$": "babel-jest"
  }
}
```

In `app/metro.config.js`, add `config.resolver.sourceExts.push('sql');` above the export so
Metro resolves the same imports at runtime.

- [ ] **Step 7: Run to verify it passes**

```bash
npm --prefix app test -- migrate
```

Expected: PASS, 4 tests.

- [ ] **Step 8: Write the failing seed test**

Create `app/src/core/db/__tests__/seed.test.ts`:

```ts
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
```

- [ ] **Step 9: Run to verify it fails**

```bash
npm --prefix app test -- seed
```

Expected: FAIL — cannot find module `../seed`.

- [ ] **Step 10: Write the seeder**

Create `app/src/core/db/seed.ts`:

```ts
import type { SqlDriver } from './driver';

export function seedContent(driver: SqlDriver, seedSql: string, contentVersion: string): boolean {
  const row = driver.get<{ value: string }>("SELECT value FROM setting WHERE key = 'content_version'");
  if (row?.value === contentVersion) return false;
  driver.exec(seedSql);
  return true;
}
```

- [ ] **Step 11: Run to verify it passes**

```bash
npm --prefix app test
```

Expected: PASS, 8 tests across both files.

- [ ] **Step 12: Commit**

```bash
git add app/src/core/db app/package.json app/package-lock.json app/metro.config.js
git commit -m "feat: add SQLite driver, migrations and content seeding

The driver interface lets migrations, seeding and repositories be unit
tested in plain Node against better-sqlite3, while the app uses
expo-sqlite. Content tables reseed only when content_version changes and
never touch user tables, so upgrading bundled knowledge cannot destroy a
user's scan history."
```

---

### Task 4: Content repositories

**Files:**
- Create: `app/src/core/db/repositories/content.ts`
- Test: `app/src/core/db/__tests__/content.test.ts`

**Interfaces:**
- Consumes: `SqlDriver` and `migrate` from Task 3; `seed.sql` from Task 2.
- Produces: `listFruits(driver): Fruit[]`, `listVarieties(driver, fruitKey): Variety[]`,
  `listMlVarieties(driver, fruitKey): Variety[]`, `getVariety(driver, key): Variety | undefined`,
  and the types `Fruit { key, nameEn, nameFil, emoji, mlClassIndex }` and
  `Variety { key, fruitKey, nameEn, nameFil, mlClassIndex, isMlClass, parentKey, sourceId }`.
  Task 5 and later plans consume these.

- [ ] **Step 1: Write the failing test**

Create `app/src/core/db/__tests__/content.test.ts`. It runs against the real generated
`seed.sql`, so it doubles as an integration check on Task 2's output.

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { createTestDriver } from '../testing/betterSqliteDriver';
import { migrate } from '../migrate';
import { seedContent } from '../seed';
import { listFruits, listVarieties, listMlVarieties, getVariety } from '../repositories/content';

function seeded() {
  const db = createTestDriver();
  migrate(db);
  const sql = readFileSync(join(__dirname, '../seed.sql'), 'utf8');
  seedContent(db, sql, 'test');
  return db;
}

test('lists exactly the three supported fruits in class order', () => {
  const fruits = listFruits(seeded());
  expect(fruits.map(f => f.key)).toEqual(['banana', 'mango', 'papaya']);
});

test('never exposes orange or capsicum', () => {
  const keys = listFruits(seeded()).map(f => f.key);
  expect(keys).not.toContain('orange');
  expect(keys).not.toContain('capsicum');
});

test('lists all mango varieties including clonal strains', () => {
  const keys = listVarieties(seeded(), 'mango').map(v => v.key);
  expect(keys).toContain('carabao');
  expect(keys).toContain('mmsu_gold');
});

test('lists only ml classes for the classifier, in index order', () => {
  const keys = listMlVarieties(seeded(), 'mango').map(v => v.key);
  expect(keys).toEqual(['carabao', 'pico', 'katchamita']);
});

test('exposes a strain parent so the UI can explain the relationship', () => {
  const gold = getVariety(seeded(), 'mmsu_gold');
  expect(gold?.parentKey).toBe('carabao');
  expect(gold?.isMlClass).toBe(false);
});

test('returns undefined for an unknown variety rather than throwing', () => {
  expect(getVariety(seeded(), 'nope')).toBeUndefined();
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm --prefix app test -- content
```

Expected: FAIL — cannot find module `../repositories/content`.

- [ ] **Step 3: Regenerate seed.sql so the test has real data**

```bash
npm run compile:knowledge
```

- [ ] **Step 4: Write the repository**

Create `app/src/core/db/repositories/content.ts`:

```ts
import type { SqlDriver } from '../driver';

export interface Fruit {
  key: string; nameEn: string; nameFil: string; emoji: string | null; mlClassIndex: number;
}

export interface Variety {
  key: string; fruitKey: string; nameEn: string; nameFil: string;
  mlClassIndex: number | null; isMlClass: boolean;
  parentKey: string | null; sourceId: string | null;
}

interface FruitRow { key: string; name_en: string; name_fil: string; emoji: string | null; ml_class_index: number }
interface VarietyRow {
  key: string; fruit_key: string; name_en: string; name_fil: string;
  ml_class_index: number | null; is_ml_class: number; parent_key: string | null; source_id: string | null;
}

const toFruit = (r: FruitRow): Fruit => ({
  key: r.key, nameEn: r.name_en, nameFil: r.name_fil, emoji: r.emoji, mlClassIndex: r.ml_class_index,
});

const toVariety = (r: VarietyRow): Variety => ({
  key: r.key, fruitKey: r.fruit_key, nameEn: r.name_en, nameFil: r.name_fil,
  mlClassIndex: r.ml_class_index, isMlClass: r.is_ml_class === 1,
  parentKey: r.parent_key, sourceId: r.source_id,
});

export function listFruits(driver: SqlDriver): Fruit[] {
  return driver.all<FruitRow>('SELECT * FROM fruit ORDER BY ml_class_index').map(toFruit);
}

export function listVarieties(driver: SqlDriver, fruitKey: string): Variety[] {
  return driver
    .all<VarietyRow>('SELECT * FROM variety WHERE fruit_key = ? ORDER BY is_ml_class DESC, ml_class_index, key', [fruitKey])
    .map(toVariety);
}

export function listMlVarieties(driver: SqlDriver, fruitKey: string): Variety[] {
  return driver
    .all<VarietyRow>('SELECT * FROM variety WHERE fruit_key = ? AND is_ml_class = 1 ORDER BY ml_class_index', [fruitKey])
    .map(toVariety);
}

export function getVariety(driver: SqlDriver, key: string): Variety | undefined {
  const row = driver.get<VarietyRow>('SELECT * FROM variety WHERE key = ?', [key]);
  return row ? toVariety(row) : undefined;
}
```

- [ ] **Step 5: Run to verify it passes**

```bash
npm --prefix app test
```

Expected: PASS, 14 tests.

- [ ] **Step 6: Commit**

```bash
git add app/src/core/db/repositories app/src/core/db/__tests__
git commit -m "feat: add content repositories over the knowledge tables

listMlVarieties is the only path the classifier uses, so clonal strains
are structurally incapable of becoming model outputs. Tests run against
the real generated seed.sql, making them an integration check on the
knowledge compiler as well."
```

---

### Task 5: Model registry

**Files:**
- Create: `models/manifest.json`, `models/README.md`
- Create: `scripts/sync-models.mjs`, `app/src/core/ml/manifest.ts`, `app/src/core/ml/registry.ts`
- Test: `scripts/sync-models.test.mjs`, `app/src/core/ml/__tests__/registry.test.ts`
- Modify: root `package.json`

**Interfaces:**
- Consumes: `ml/classes.json` from Task 2.
- Produces: `type ModelState = 'ready' | 'missing' | 'checksum_mismatch'`;
  `interface ModelStatus { id: string; stage: number; state: ModelState; source: 'bundled' | 'device' | null; version: string | null }`;
  `resolveModels(manifest, bundled, checksums): ModelStatus[]`;
  `pipelineDepth(statuses): 0 | 1 | 2 | 3`. Task 6 and the detection plan consume both.

- [ ] **Step 1: Write the empty manifest and its README**

Create `models/manifest.json`. It is deliberately empty — training has not finished, and the app
must handle exactly this state.

```json
{
  "manifest_version": 1,
  "models": []
}
```

Create `models/README.md`:

```markdown
# Model weights

Place trained `.tflite` files here, then add a matching entry to `manifest.json`.
`npm run sync:models` copies them into the app bundle and regenerates the require map;
it runs automatically on `npm start` and `npm run prebuild`.

Expected entries once training completes:

| id                | stage | task                                  |
|-------------------|-------|---------------------------------------|
| `fruit_detector`  | 1     | Detect and localise banana/mango/papaya |
| `variety_banana`  | 2     | Classify 4 banana varieties            |
| `variety_mango`   | 2     | Classify 3 mango varieties             |
| `variety_papaya`  | 2     | Classify 4 papaya varieties            |
| `disease_detector`| 3     | Detect disease on the cropped fruit    |

Compute a checksum with `sha256sum <file>` (or `certutil -hashfile <file> SHA256` on Windows).

The app builds, installs and runs with this directory empty.
```

- [ ] **Step 2: Write the failing sync-models test**

Create `scripts/sync-models.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRequireMap } from './sync-models.mjs';

test('generates a valid empty map when there are no models', () => {
  const out = generateRequireMap([]);
  assert.match(out, /export const bundledModels/);
  assert.match(out, /\{\s*\}/);
  assert.ok(!out.includes('require('), 'must not emit a require for a file that does not exist');
});

test('emits one require per model file', () => {
  const out = generateRequireMap(['fruit_detector_v1.tflite', 'variety_banana_v1.tflite']);
  assert.ok(out.includes("'fruit_detector_v1.tflite': require('../../../assets/models/fruit_detector_v1.tflite')"));
  assert.ok(out.includes("'variety_banana_v1.tflite': require('../../../assets/models/variety_banana_v1.tflite')"));
});

test('rejects filenames that would break out of the assets directory', () => {
  assert.throws(() => generateRequireMap(['../../etc/passwd']), /invalid model filename/i);
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
npm run test:scripts
```

Expected: FAIL — cannot find module `./sync-models.mjs`.

- [ ] **Step 4: Write the sync script**

Create `scripts/sync-models.mjs`:

```js
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const SAFE = /^[A-Za-z0-9._-]+\.tflite$/;

export function generateRequireMap(filenames) {
  for (const f of filenames) {
    if (!SAFE.test(f)) throw new Error(`invalid model filename: ${f}`);
  }
  const entries = filenames
    .map(f => `  '${f}': require('../../../assets/models/${f}'),`)
    .join('\n');
  return (
    `// Generated by scripts/sync-models.mjs. Do not edit.\n` +
    `export const bundledModels: Record<string, number> = {\n${entries}\n};\n`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = new URL('../', import.meta.url).pathname;
  const src = join(root, 'models');
  const dest = join(root, 'app/assets/models');

  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });

  const manifest = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'));
  const files = manifest.models.map(m => m.file);
  const present = new Set(readdirSync(src).filter(f => f.endsWith('.tflite')));

  for (const f of files) {
    if (!present.has(f)) {
      console.warn(`[sync-models] manifest lists ${f} but it is not in models/ — skipping`);
      continue;
    }
    copyFileSync(join(src, f), join(dest, f));
  }

  const copied = files.filter(f => present.has(f));
  mkdirSync(join(root, 'app/src/core/ml'), { recursive: true });
  writeFileSync(join(root, 'app/src/core/ml/bundledModels.ts'), generateRequireMap(copied), 'utf8');

  // Metro will not resolve imports outside app/, so the manifest is copied in.
  writeFileSync(
    join(root, 'app/src/core/ml/manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );

  console.log(`[sync-models] bundled ${copied.length} model(s)`);
}
```

Add `app/src/core/ml/manifest.json` to the generated-artifacts block in `.gitignore`.

Add to the root `package.json` scripts. npm runs a `pre<name>` script automatically before
`<name>`, so `prestart` fires before `start` and `prebuild:apk` fires before `build:apk` — this
is what keeps the copy invisible to the documented workflow:

```json
"prestart": "npm run compile:knowledge && npm run sync:models",
"start": "npm --prefix app start",
"prebuild:apk": "npm run compile:knowledge && npm run sync:models",
"build:apk": "cd app && npx expo prebuild --platform android --clean && ./android/gradlew -p android assembleRelease"
```

- [ ] **Step 5: Run to verify it passes**

```bash
npm run test:scripts && npm run sync:models
```

Expected: PASS; `[sync-models] bundled 0 model(s)`; `app/src/core/ml/bundledModels.ts` exists
with an empty object.

- [ ] **Step 6: Write the failing registry test**

Create `app/src/core/ml/__tests__/registry.test.ts`:

```ts
import { resolveModels, pipelineDepth } from '../registry';

const manifest = {
  manifest_version: 1,
  models: [
    { id: 'fruit_detector', stage: 1, file: 'fd.tflite', sha256: 'aaa', version: '1.0.0', min_confidence: 0.5 },
    { id: 'variety_banana', stage: 2, file: 'vb.tflite', sha256: 'bbb', version: '1.0.0', min_confidence: 0.6 },
    { id: 'disease_detector', stage: 3, file: 'dd.tflite', sha256: 'ccc', version: '1.0.0', min_confidence: 0.5 },
  ],
};

test('reports every model missing when nothing is bundled', () => {
  const s = resolveModels(manifest, {}, {});
  expect(s.every(m => m.state === 'missing')).toBe(true);
  expect(s.every(m => m.source === null)).toBe(true);
});

test('an empty manifest yields no statuses and depth zero', () => {
  const s = resolveModels({ manifest_version: 1, models: [] }, {}, {});
  expect(s).toEqual([]);
  expect(pipelineDepth(s)).toBe(0);
});

test('marks a bundled model with a matching checksum ready', () => {
  const s = resolveModels(manifest, { 'fd.tflite': 1 }, { 'fd.tflite': 'aaa' });
  expect(s.find(m => m.id === 'fruit_detector')).toMatchObject({ state: 'ready', source: 'bundled' });
});

test('flags a checksum mismatch instead of loading it', () => {
  const s = resolveModels(manifest, { 'fd.tflite': 1 }, { 'fd.tflite': 'wrong' });
  expect(s.find(m => m.id === 'fruit_detector')?.state).toBe('checksum_mismatch');
});

test('treats an uncomputed checksum as unverified, not as a mismatch', () => {
  const s = resolveModels(manifest, { 'fd.tflite': 1 }, {});
  const fd = s.find(m => m.id === 'fruit_detector');
  expect(fd?.state).toBe('ready');
  expect(fd?.verified).toBe(false);
});

test('marks a matching checksum as verified', () => {
  const s = resolveModels(manifest, { 'fd.tflite': 1 }, { 'fd.tflite': 'aaa' });
  expect(s.find(m => m.id === 'fruit_detector')?.verified).toBe(true);
});

test('depth is zero when stage 1 is missing, even if later stages are ready', () => {
  const s = resolveModels(manifest, { 'vb.tflite': 1, 'dd.tflite': 1 }, { 'vb.tflite': 'bbb', 'dd.tflite': 'ccc' });
  expect(pipelineDepth(s)).toBe(0);
});

test('depth is one when only stage 1 is ready', () => {
  const s = resolveModels(manifest, { 'fd.tflite': 1 }, { 'fd.tflite': 'aaa' });
  expect(pipelineDepth(s)).toBe(1);
});

test('depth is two when stage 1 and a stage 2 head are ready', () => {
  const s = resolveModels(manifest, { 'fd.tflite': 1, 'vb.tflite': 1 }, { 'fd.tflite': 'aaa', 'vb.tflite': 'bbb' });
  expect(pipelineDepth(s)).toBe(2);
});

test('depth is three only when all stages are ready', () => {
  const s = resolveModels(
    manifest,
    { 'fd.tflite': 1, 'vb.tflite': 1, 'dd.tflite': 1 },
    { 'fd.tflite': 'aaa', 'vb.tflite': 'bbb', 'dd.tflite': 'ccc' },
  );
  expect(pipelineDepth(s)).toBe(3);
});

test('a checksum mismatch on stage 1 stops the pipeline', () => {
  const s = resolveModels(manifest, { 'fd.tflite': 1, 'vb.tflite': 1 }, { 'fd.tflite': 'wrong', 'vb.tflite': 'bbb' });
  expect(pipelineDepth(s)).toBe(0);
});
```

- [ ] **Step 7: Run to verify it fails**

```bash
npm --prefix app test -- registry
```

Expected: FAIL — cannot find module `../registry`.

- [ ] **Step 8: Write the manifest types and registry**

Create `app/src/core/ml/manifest.ts`:

```ts
export interface ModelEntry {
  id: string;
  stage: number;
  file: string;
  sha256: string;
  version: string;
  min_confidence: number;
}

export interface Manifest {
  manifest_version: number;
  models: ModelEntry[];
}
```

Create `app/src/core/ml/registry.ts`:

```ts
import type { Manifest, ModelEntry } from './manifest';

export type ModelState = 'ready' | 'missing' | 'checksum_mismatch';

export interface ModelStatus {
  id: string;
  stage: number;
  state: ModelState;
  source: 'bundled' | 'device' | null;
  version: string | null;
  /** False when no checksum was computed for this file. Never blocks loading. */
  verified: boolean;
}

function resolveOne(
  entry: ModelEntry,
  bundled: Record<string, number>,
  checksums: Record<string, string>,
): ModelStatus {
  const base = { id: entry.id, stage: entry.stage, version: entry.version };
  if (!(entry.file in bundled)) {
    return { ...base, state: 'missing', source: null, verified: false };
  }
  const actual = checksums[entry.file];
  if (actual === undefined) {
    // Hashing a bundled asset needs expo-file-system and expo-crypto, which the
    // detection plan introduces. Until then a bundled file is trusted but flagged
    // unverified, so an absent hash can never be mistaken for a corrupt model.
    return { ...base, state: 'ready', source: 'bundled', verified: false };
  }
  if (actual !== entry.sha256) {
    return { ...base, state: 'checksum_mismatch', source: null, verified: false };
  }
  return { ...base, state: 'ready', source: 'bundled', verified: true };
}

export function resolveModels(
  manifest: Manifest,
  bundled: Record<string, number>,
  checksums: Record<string, string>,
): ModelStatus[] {
  return manifest.models.map(m => resolveOne(m, bundled, checksums));
}

/** Highest contiguous stage that can run. A gap stops the pipeline. */
export function pipelineDepth(statuses: ModelStatus[]): 0 | 1 | 2 | 3 {
  const ready = (stage: number) => statuses.some(s => s.stage === stage && s.state === 'ready');
  if (!ready(1)) return 0;
  if (!ready(2)) return 1;
  if (!ready(3)) return 2;
  return 3;
}
```

- [ ] **Step 9: Run to verify it passes**

```bash
npm --prefix app test
```

Expected: PASS, 25 tests.

- [ ] **Step 10: Commit**

```bash
git add models scripts app/src/core/ml package.json
git commit -m "feat: add model registry and bundling pipeline

models/ is the single designated directory for trained weights;
sync-models copies them into the app bundle and regenerates the require
map from prestart and prebuild hooks, so the documented workflow stays
'place the file and start the app' despite an APK being read-only.

The manifest ships empty because training is unfinished. pipelineDepth
encodes the degradation ladder: a gap at any stage stops the pipeline
rather than skipping ahead, and a checksum mismatch is treated as
unusable rather than loaded."
```

---

### Task 6: System status, model status screen, and the APK

**Files:**
- Create: `app/src/core/status/index.ts`, `app/src/features/modelStatus/ModelStatusScreen.tsx`
- Test: `app/src/core/status/__tests__/status.test.ts`
- Modify: `app/App.tsx`, `app/app.json`, `app/eas.json`
- Create: `docs/BUILDING.md`

**Interfaces:**
- Consumes: `ModelStatus`, `pipelineDepth` from Task 5; `listFruits` from Task 4.
- Produces: `describeDetectionCapability(statuses): { depth, headline, detail }` — consumed by the
  detection plan's result screen.

- [ ] **Step 1: Write the failing status test**

Create `app/src/core/status/__tests__/status.test.ts`:

```ts
import { describeDetectionCapability } from '..';
import type { ModelStatus } from '../../ml/registry';

const ready = (id: string, stage: number): ModelStatus =>
  ({ id, stage, state: 'ready', source: 'bundled', version: '1.0.0', verified: true });
const missing = (id: string, stage: number): ModelStatus =>
  ({ id, stage, state: 'missing', source: null, version: '1.0.0', verified: false });

test('says detection is unavailable when no models are installed', () => {
  const r = describeDetectionCapability([]);
  expect(r.depth).toBe(0);
  expect(r.headline).toBe('Detection model not installed');
});

test('never claims a capability the models cannot deliver', () => {
  const r = describeDetectionCapability([ready('fruit_detector', 1), missing('variety_banana', 2)]);
  expect(r.depth).toBe(1);
  expect(r.headline).toBe('Fruit only');
  expect(r.detail).toContain('variety');
});

test('reports variety capability when stage 2 is ready', () => {
  const r = describeDetectionCapability([ready('fruit_detector', 1), ready('variety_banana', 2)]);
  expect(r.depth).toBe(2);
  expect(r.headline).toBe('Fruit and variety');
});

test('reports full capability only with all three stages', () => {
  const r = describeDetectionCapability([
    ready('fruit_detector', 1), ready('variety_banana', 2), ready('disease_detector', 3),
  ]);
  expect(r.depth).toBe(3);
  expect(r.headline).toBe('Fruit, variety and disease');
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm --prefix app test -- status
```

Expected: FAIL — cannot find module `..`.

- [ ] **Step 3: Write the status module**

Create `app/src/core/status/index.ts`:

```ts
import { pipelineDepth, type ModelStatus } from '../ml/registry';

export interface DetectionCapability {
  depth: 0 | 1 | 2 | 3;
  headline: string;
  detail: string;
}

const DESCRIPTIONS: Record<number, { headline: string; detail: string }> = {
  0: {
    headline: 'Detection model not installed',
    detail: 'Scanning is unavailable. Fruit and variety information, climate data and the assistant still work.',
  },
  1: {
    headline: 'Fruit only',
    detail: 'Scans identify the fruit. The variety and disease models are not installed.',
  },
  2: {
    headline: 'Fruit and variety',
    detail: 'Scans identify the fruit and its variety. The disease model is not installed.',
  },
  3: {
    headline: 'Fruit, variety and disease',
    detail: 'All detection stages are available.',
  },
};

export function describeDetectionCapability(statuses: ModelStatus[]): DetectionCapability {
  const depth = pipelineDepth(statuses);
  return { depth, ...DESCRIPTIONS[depth] };
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm --prefix app test
```

Expected: PASS, 29 tests.

- [ ] **Step 5: Build the Model Status screen**

Deliberately unstyled — the front-end design plugin owns presentation. This exists to prove the
data path end to end on a real device.

Create `app/src/features/modelStatus/ModelStatusScreen.tsx`:

```tsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { describeDetectionCapability } from '../../core/status';
import { resolveModels } from '../../core/ml/registry';
import { bundledModels } from '../../core/ml/bundledModels';
import manifest from '../../core/ml/manifest.json';

export function ModelStatusScreen() {
  const statuses = resolveModels(manifest, bundledModels, {});
  const capability = describeDetectionCapability(statuses);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>{capability.headline}</Text>
      <Text>{capability.detail}</Text>
      <Text style={{ marginTop: 16, fontWeight: '600' }}>Models ({statuses.length})</Text>
      {statuses.length === 0 && <Text>No models declared in manifest.json.</Text>}
      {statuses.map(s => (
        <View key={s.id}>
          <Text>{`Stage ${s.stage} · ${s.id} · ${s.state}${s.source ? ` (${s.source})` : ''}`}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
```

Replace `app/App.tsx` with:

```tsx
import React from 'react';
import { SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ModelStatusScreen } from './src/features/modelStatus/ModelStatusScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <ModelStatusScreen />
    </SafeAreaView>
  );
}
```

- [ ] **Step 6: Configure Android permissions and identity**

Edit `app/app.json` so the `expo` object contains:

```json
{
  "name": "PrutasAI",
  "slug": "prutasai",
  "version": "2.0.0",
  "orientation": "portrait",
  "userInterfaceStyle": "automatic",
  "android": {
    "package": "com.prutasai.app",
    "versionCode": 1,
    "permissions": ["CAMERA", "ACCESS_COARSE_LOCATION"]
  }
}
```

`ACCESS_FINE_LOCATION` is deliberately absent — the design requests low accuracy only.
`READ_EXTERNAL_STORAGE` from the prototype is dropped in favour of the scoped photo picker.

- [ ] **Step 7: Configure the APK build profile**

Create `app/eas.json`. Without `buildType: apk`, EAS emits an `.aab`, which cannot be sideloaded.

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "apk" }
    }
  }
}
```

- [ ] **Step 8: Generate the native Android project**

```bash
npm run compile:knowledge && npm run sync:models
cd app && npx expo prebuild --platform android --clean
```

Expected: an `app/android/` directory is created. It is gitignored — it is regenerated from
`app.json`, and committing it would let the two drift apart.

- [ ] **Step 9: Build the APK**

```bash
cd app && ./android/gradlew -p android assembleRelease
```

Expected: `app/android/app/build/outputs/apk/release/app-release.apk`.

If the Android SDK is not installed, use EAS instead: `cd app && eas build -p android --profile preview`.

- [ ] **Step 10: Install and verify on a device**

```bash
adb install -r app/android/app/build/outputs/apk/release/app-release.apk
```

Expected on launch: the heading reads **"Detection model not installed"**, the body explains that
scanning is unavailable while other features work, and the models list reads
**"No models declared in manifest.json."** This is the goal state of this plan — an installed,
working APK that is honest about having no weights.

- [ ] **Step 11: Write the build documentation**

Create `docs/BUILDING.md` with exactly this content:

````markdown
# Building the PrutasAI APK

The app builds, installs, and runs with no model weights present. This is the expected state
until training finishes.

## Prerequisites

- Node.js 20 or newer
- JDK 17 (required by the Android Gradle Plugin)
- Android SDK with platform-tools on `PATH` (for the local route)
- An Expo account (only for the EAS route)

## First-time setup

```bash
npm install
npm --prefix app install
npm run compile:knowledge
```

## Build locally, no account or network needed

```bash
npm run build:apk
```

Output: `app/android/app/build/outputs/apk/release/app-release.apk`

## Build with EAS, no Android SDK needed

```bash
cd app
eas build -p android --profile preview
```

The `preview` profile sets `buildType: apk`. Without it EAS emits an `.aab`, which cannot be
sideloaded onto a device.

## Install

```bash
adb install -r app/android/app/build/outputs/apk/release/app-release.apk
```

## Adding trained model weights

1. Copy the `.tflite` file into `models/`.
2. Compute its checksum:
   - Linux/macOS: `sha256sum models/<file>.tflite`
   - Windows: `certutil -hashfile models\<file>.tflite SHA256`
3. Add an entry to `models/manifest.json` with the filename, checksum, stage, version, and
   `min_confidence`.
4. Rebuild. `npm start` and `npm run build:apk` both sync `models/` into the app bundle
   automatically.

## Troubleshooting

**`SDK location not found`** — set `ANDROID_HOME`, or create `app/android/local.properties`
containing `sdk.dir=/path/to/Android/sdk`.

**`Unsupported class file major version`** — you are on the wrong JDK. Confirm with
`java -version`; it must report 17.

**Build produces `.aab` instead of `.apk`** — the EAS profile is missing
`"android": { "buildType": "apk" }`.

**App shows "Detection model not installed"** — correct behaviour when `models/` is empty.
````

- [ ] **Step 12: Commit**

```bash
git add app docs/BUILDING.md
git commit -m "feat: add model status screen and Android APK packaging

Produces a sideloadable APK that installs and runs correctly with no
model weights present, which is the project's current state.

The status screen renders the degradation ladder end to end on a real
device, proving the knowledge compiler, database seeding and model
registry all work in the Android runtime rather than only under Jest.

app.json requests ACCESS_COARSE_LOCATION only; fine location is never
requested. eas.json sets buildType apk because the EAS default of aab
cannot be sideloaded."
```

---

## Definition of done

- [ ] `npm test` passes at the repository root, covering both script and app suites.
- [ ] `npm run compile:knowledge` regenerates `seed.sql`, `ml/classes.json`, and
      `knowledge.ts` with no manual edits.
- [ ] A release `.apk` builds with `models/` empty.
- [ ] The APK installs on a physical Android device and reports "Detection model not installed".
- [ ] No fruit or variety name is hardcoded anywhere outside `knowledge/taxonomy.yaml` —
      verify with `git grep -n -i "lakatan\|carabao\|latundan" -- app ml scripts` returning
      matches only in generated files.
- [ ] `git grep -n -i "orange\|capsicum" -- app knowledge scripts models` returns nothing.
- [ ] `git grep -n "gsk_\|mongodb://" ` returns nothing.

## Subsequent plans

This plan deliberately stops before inference. The remaining work, each producing independently
testable software:

2. **Detection** — TFLite runtime, three-stage pipeline, Eigen-CAM, scale-invariant severity,
   capture and result screens.
3. **Climate and location** — Open-Meteo provider, observation and normals caches, freshness
   states, offline-to-online refresh, coarse location with lazy permission.
4. **Chatbot** — intent matching, context assembly, the four-verdict suitability function,
   template renderer, Groq provider with verdict-echo and numeric guards.
5. **History, monitoring, and the optional server** — scan history, Day 1/5/10 monitoring,
   FastAPI sync and admin.
