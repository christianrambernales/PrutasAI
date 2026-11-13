import { resolveModelRegistry } from '../registry';
import type { ModelRoleId, SupportedFruit, Manifest, VerifiedModels } from '../manifest';

const FRUITS: SupportedFruit[] = ['banana', 'mango', 'papaya'];
const STAGES: Record<ModelRoleId, number> = {
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

function entry(id: ModelRoleId, file = `${id}.tflite`) {
  return {
    id,
    stage: STAGES[id],
    file,
    sha256: `sha-${id}`,
    version: '1.0.0',
    min_confidence: 0.5,
    fruits: ROLE_FRUITS[id],
  };
}

function inputs(ids: ModelRoleId[], overrides: Record<string, unknown> = {}) {
  const models = ids.map(id => entry(id));
  const manifest: Manifest = { manifest_version: 1, models };
  const verifiedModels = {
    manifest_version: 1,
    validation_status: 'build_validated',
    inference_status: 'unverified',
    models: models.map(model => ({
      id: model.id,
      stage: model.stage,
      file: model.file,
      version: model.version,
      sha256: model.sha256,
      fruits: model.fruits,
    })),
    ...overrides,
  };
  const bundled = Object.fromEntries(models.map(model => [model.file, 1]));
  return { manifest, bundled, verifiedModels };
}

test('an empty manifest reports no validated roles and never enables inference', () => {
  const { manifest, bundled, verifiedModels } = inputs([]);
  const registry = resolveModelRegistry(manifest, bundled, verifiedModels);

  expect(registry.models).toEqual([]);
  for (const fruit of FRUITS) {
    expect(registry.fruits[fruit].validatedRoles).toEqual([]);
    expect(registry.fruits[fruit].prerequisiteValidatedRoles).toEqual([]);
  }
  expect(registry.inferenceVerified).toBe(false);
  expect(registry.canRunInference).toBe(false);
});

test('a fruit detector alone establishes only the first validated role for each supported fruit', () => {
  const { manifest, bundled, verifiedModels } = inputs(['fruit_detector']);
  const registry = resolveModelRegistry(manifest, bundled, verifiedModels);

  for (const fruit of FRUITS) {
    expect(registry.fruits[fruit].validatedRoles).toEqual(['fruit_detector']);
    expect(registry.fruits[fruit].prerequisiteValidatedRoles).toEqual(['fruit_detector']);
  }
  expect(registry.canRunInference).toBe(false);
});

test('a banana variety head does not imply mango or papaya coverage or bypass fruit detection', () => {
  const { manifest, bundled, verifiedModels } = inputs(['variety_banana']);
  const registry = resolveModelRegistry(manifest, bundled, verifiedModels);

  expect(registry.fruits.banana.validatedRoles).toEqual(['variety_banana']);
  expect(registry.fruits.banana.prerequisiteValidatedRoles).toEqual([]);
  expect(registry.fruits.mango.validatedRoles).toEqual([]);
  expect(registry.fruits.papaya.validatedRoles).toEqual([]);
});

test.each([
  ['banana', 'variety_banana'],
  ['mango', 'variety_mango'],
  ['papaya', 'variety_papaya'],
] as const)('all three variety heads remain fruit-specific (%s)', (fruit, role) => {
  const { manifest, bundled, verifiedModels } = inputs(['fruit_detector', 'variety_banana', 'variety_mango', 'variety_papaya']);
  const registry = resolveModelRegistry(manifest, bundled, verifiedModels);

  expect(registry.fruits[fruit].prerequisiteValidatedRoles).toEqual(['fruit_detector', role]);
  for (const otherFruit of FRUITS.filter(candidate => candidate !== fruit)) {
    expect(registry.fruits[otherFruit].prerequisiteValidatedRoles).toHaveLength(2);
    expect(registry.fruits[otherFruit].prerequisiteValidatedRoles).not.toContain(role);
  }
});

test('a disease model without its fruit and variety prerequisites is not in any validated chain', () => {
  const { manifest, bundled, verifiedModels } = inputs(['disease_detector']);
  const registry = resolveModelRegistry(manifest, bundled, verifiedModels);

  for (const fruit of FRUITS) {
    expect(registry.fruits[fruit].validatedRoles).toEqual(['disease_detector']);
    expect(registry.fruits[fruit].prerequisiteValidatedRoles).toEqual([]);
  }
});

test('a verified metadata record without a SHA-256 cannot make a bundled role ready', () => {
  const { manifest, bundled, verifiedModels } = inputs(['fruit_detector']);
  const withoutHash = {
    ...verifiedModels,
    models: verifiedModels.models.map(({ sha256: _sha256, ...model }) => model),
  };
  const registry = resolveModelRegistry(manifest, bundled, withoutHash as unknown as VerifiedModels);

  expect(registry.models[0]).toMatchObject({ state: 'checksum_mismatch', source: null, verified: false });
  expect(registry.fruits.banana.prerequisiteValidatedRoles).toEqual([]);
});

test('a validated file absent from the static asset map is unavailable', () => {
  const { manifest, verifiedModels } = inputs(['fruit_detector']);
  const registry = resolveModelRegistry(manifest, {}, verifiedModels);

  expect(registry.models[0]).toMatchObject({ state: 'missing', source: null, verified: false });
  expect(registry.fruits.banana.prerequisiteValidatedRoles).toEqual([]);
});

test.each([
  ['missing generated metadata', undefined],
  ['generated checksum mismatch', (verifiedModels: any) => ({ ...verifiedModels, models: verifiedModels.models.map((model: any) => ({ ...model, sha256: 'wrong-hash' })) })],
  ['generated filename mismatch', (verifiedModels: any) => ({ ...verifiedModels, models: verifiedModels.models.map((model: any) => ({ ...model, file: 'other.tflite' })) })],
  ['generated version mismatch', (verifiedModels: any) => ({ ...verifiedModels, models: verifiedModels.models.map((model: any) => ({ ...model, version: '2.0.0' })) })],
  ['generated role mismatch', (verifiedModels: any) => ({ ...verifiedModels, models: verifiedModels.models.map((model: any) => ({ ...model, id: 'variety_mango' })) })],
  ['unvalidated build metadata', (verifiedModels: any) => ({ ...verifiedModels, validation_status: 'invalid' })],
] as const)('%s cannot expose a ready model or role', (_name, mutate) => {
  const { manifest, bundled, verifiedModels } = inputs(['fruit_detector']);
  const candidate = typeof mutate === 'function' ? mutate(verifiedModels) : undefined;
  const registry = resolveModelRegistry(manifest, bundled, candidate);

  expect(registry.models[0]).toMatchObject({ state: expect.not.stringMatching(/^ready$/), source: null, verified: false });
  expect(registry.fruits.banana.prerequisiteValidatedRoles).toEqual([]);
  expect(registry.canRunInference).toBe(false);
});

test('a mismatched source manifest version makes every generated model unavailable', () => {
  const { manifest, bundled, verifiedModels } = inputs(['fruit_detector']);
  const registry = resolveModelRegistry({ ...manifest, manifest_version: 2 }, bundled, verifiedModels);

  expect(registry.models[0]).toMatchObject({ state: expect.not.stringMatching(/^ready$/), source: null });
  expect(registry.fruits.banana.prerequisiteValidatedRoles).toEqual([]);
});

test('matching build-validated roles form each fruit chain but never claim inference', () => {
  const { manifest, bundled, verifiedModels } = inputs([
    'fruit_detector', 'variety_banana', 'variety_mango', 'variety_papaya', 'disease_detector',
  ]);
  const registry = resolveModelRegistry(manifest, bundled, verifiedModels);

  for (const fruit of FRUITS) {
    expect(registry.fruits[fruit].prerequisiteValidatedRoles).toEqual([
      'fruit_detector', `variety_${fruit}`, 'disease_detector',
    ]);
  }
  expect(registry.inferenceVerified).toBe(false);
  expect(registry.canRunInference).toBe(false);
});
