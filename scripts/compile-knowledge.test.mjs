import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { compileKnowledge, KnowledgeError } from './compile-knowledge.mjs';

const dir = fileURLToPath(new URL('../knowledge/', import.meta.url));

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
