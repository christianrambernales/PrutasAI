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
