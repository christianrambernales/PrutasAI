import { describeDetectionCapability } from '..';
import { resolveModelRegistry } from '../../ml/registry';
import type { ModelRoleId, SupportedFruit } from '../../ml/manifest';

const FRUITS: SupportedFruit[] = ['banana', 'mango', 'papaya'];
const ROLES: ModelRoleId[] = [
  'fruit_detector', 'variety_banana', 'variety_mango', 'variety_papaya', 'disease_detector',
];
const STAGE: Record<ModelRoleId, number> = {
  fruit_detector: 1,
  variety_banana: 2,
  variety_mango: 2,
  variety_papaya: 2,
  disease_detector: 3,
};
const ROLE_FRUITS: Record<ModelRoleId, SupportedFruit[]> = {
  fruit_detector: FRUITS,
  variety_banana: ['banana'],
  variety_mango: ['mango'],
  variety_papaya: ['papaya'],
  disease_detector: FRUITS,
};

function capabilityFor(roles: ModelRoleId[]) {
  const models = roles.map(id => ({
    id,
    stage: STAGE[id],
    file: `${id}.tflite`,
    sha256: `sha-${id}`,
    version: '1.0.0',
    min_confidence: 0.5,
    fruits: ROLE_FRUITS[id],
  }));
  const registry = resolveModelRegistry(
    { manifest_version: 1, models },
    Object.fromEntries(models.map(model => [model.file, 1])),
    {
      manifest_version: 1,
      validation_status: 'build_validated',
      inference_status: 'unverified',
      models: models.map(({ id, stage, file, version, sha256, fruits }) => ({ id, stage, file, version, sha256, fruits })),
    },
  );
  return describeDetectionCapability(registry);
}

test('model-free status keeps inference unavailable', () => {
  const result = capabilityFor([]);

  expect(result.depth).toBe(0);
  expect(result.canRunInference).toBe(false);
  expect(result.inferenceVerified).toBe(false);
});

test('build-validated files never produce scan or diagnosis availability wording', () => {
  const result = capabilityFor(ROLES);
  const copy = `${result.headline} ${result.detail}`.toLowerCase();

  expect(result.depth).toBe(0);
  expect(result.canRunInference).toBe(false);
  expect(result.inferenceVerified).toBe(false);
  expect(copy).not.toMatch(/scan.{0,20}available|available.{0,20}scan|diagnos/);
  expect(result.fruits.banana.prerequisiteValidatedRoles).toEqual([
    'fruit_detector', 'variety_banana', 'disease_detector',
  ]);
  expect(result.fruits.mango.prerequisiteValidatedRoles).toEqual([
    'fruit_detector', 'variety_mango', 'disease_detector',
  ]);
  expect(result.fruits.papaya.prerequisiteValidatedRoles).toEqual([
    'fruit_detector', 'variety_papaya', 'disease_detector',
  ]);
});

test('status keeps a banana-only head separate from mango and papaya', () => {
  const result = capabilityFor(['fruit_detector', 'variety_banana']);

  expect(result.fruits.banana.prerequisiteValidatedRoles).toEqual(['fruit_detector', 'variety_banana']);
  expect(result.fruits.mango.prerequisiteValidatedRoles).toEqual(['fruit_detector']);
  expect(result.fruits.papaya.prerequisiteValidatedRoles).toEqual(['fruit_detector']);
});
