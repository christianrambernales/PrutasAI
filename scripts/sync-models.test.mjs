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
