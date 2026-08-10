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
