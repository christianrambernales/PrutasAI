import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as syncModelsModule from './sync-models.mjs';

const { generateRequireMap } = syncModelsModule;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const MODEL_FILE = 'fixture-model.tflite';
const SOURCE_BYTES = Buffer.from('temporary regular-byte plumbing fixture; not a model weight');
const EMPTY_MANIFEST = { manifest_version: 1, models: [] };
const EMPTY_APPROVALS = { schema_version: 1, approvals: [] };
const INPUT = { name: 'image', shape: [1, 224, 224, 3], dtype: 'float32' };
const OUTPUT = { name: 'scores', shape: [1, 3], dtype: 'float32' };
const SIGNATURE = {
  key: 'serving_default',
  inputs: { image: 'image' },
  outputs: { scores: 'scores' },
};

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function clone(value) {
  return structuredClone(value);
}

function modelContract({ bytes = SOURCE_BYTES, sha256 = hash(bytes), version = '1.0.0' } = {}) {
  const model = {
    id: 'fruit_detector',
    stage: 1,
    file: MODEL_FILE,
    version,
    sha256,
    fruits: ['banana', 'mango', 'papaya'],
    min_confidence: 0.5,
  };
  const approval = {
    ...clone(model),
    status: 'owner_approved',
    approved_by: 'Fixture owner',
    approved_at: '2026-09-25T00:00:00Z',
    inputs: [clone(INPUT)],
    outputs: [clone(OUTPUT)],
    signatures: [clone(SIGNATURE)],
    label_mapping: {
      output_name: 'scores',
      index_to_label: ['banana', 'mango', 'papaya'],
    },
  };
  delete approval.stage;
  return {
    manifest: { manifest_version: 1, models: [model] },
    approvals: { schema_version: 1, approvals: [approval] },
  };
}

function inspectorDetails() {
  return {
    schemaVersion: 1,
    inputs: [{ ...clone(INPUT), shapeSignature: [...INPUT.shape] }],
    outputs: [{ ...clone(OUTPUT), shapeSignature: [...OUTPUT.shape] }],
    signatures: [clone(SIGNATURE)],
  };
}

function outputPaths(appDir) {
  const mlDir = join(appDir, 'src', 'core', 'ml');
  return [
    ['assets', join(appDir, 'assets', 'models')],
    ['bundledModels', join(mlDir, 'bundledModels.ts')],
    ['manifest', join(mlDir, 'manifest.json')],
    ['verifiedModels', join(mlDir, 'verifiedModels.json')],
  ];
}

function listFilesRecursively(path, prefix = '') {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    const child = join(path, entry.name);
    if (entry.isDirectory()) return listFilesRecursively(child, name);
    if (entry.isSymbolicLink()) return [[name, `symlink:${readlinkSync(child)}`]];
    return [[name, readFileSync(child).toString('base64')]];
  }).sort(([left], [right]) => left.localeCompare(right));
}

async function snapshotOutputs(appDir) {
  return outputPaths(appDir).map(([name, path]) => {
    try {
      const stat = lstatSync(path);
      if (stat.isDirectory()) return [name, listFilesRecursively(path)];
      if (stat.isSymbolicLink()) return [name, `symlink:${readlinkSync(path)}`];
      return [name, readFileSync(path).toString('base64')];
    } catch (error) {
      if (error.code === 'ENOENT') return [name, '<absent>'];
      throw error;
    }
  });
}

function createFixture({ withModel = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'prutasai-sync-models-'));
  const modelsDir = join(root, 'models');
  const appDir = join(root, 'app');
  mkdirSync(modelsDir, { recursive: true });
  const { manifest, approvals } = withModel ? modelContract() : {
    manifest: clone(EMPTY_MANIFEST),
    approvals: clone(EMPTY_APPROVALS),
  };
  writeFileSync(join(modelsDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(modelsDir, 'approval.json'), `${JSON.stringify(approvals, null, 2)}\n`);
  if (withModel) writeFileSync(join(modelsDir, MODEL_FILE), SOURCE_BYTES);

  const [assetPath, bundledPath, manifestPath, verifiedPath] = outputPaths(appDir).map(([, path]) => path);
  mkdirSync(assetPath, { recursive: true });
  mkdirSync(dirname(bundledPath), { recursive: true });
  writeFileSync(join(assetPath, 'previous-output.data'), Buffer.from([0, 255, 17, 34]));
  writeFileSync(bundledPath, Buffer.from([0, 255, 17, 35]));
  writeFileSync(manifestPath, Buffer.from([0, 255, 17, 36]));
  writeFileSync(verifiedPath, Buffer.from([0, 255, 17, 37]));

  return { root, modelsDir, appDir, manifest, approvals };
}

function cleanup(fixture) {
  rmSync(fixture.root, { recursive: true, force: true });
}

async function sync(fixture, options = {}) {
  return syncModelsModule.syncModelsForTest({
    modelsDir: fixture.modelsDir,
    appDir: fixture.appDir,
    inspectModel: async () => inspectorDetails(),
    ...options,
  });
}

async function writeContracts(fixture, manifest, approvals) {
  writeFileSync(join(fixture.modelsDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(fixture.modelsDir, 'approval.json'), `${JSON.stringify(approvals, null, 2)}\n`);
}

async function assertFailurePreserves(fixture, run, expectedError) {
  const before = await snapshotOutputs(fixture.appDir);
  await assert.rejects(run(), error => {
    assert.match(error.message, expectedError);
    return true;
  });
  assert.deepEqual(await snapshotOutputs(fixture.appDir), before, 'all four generated outputs must be restored byte-for-byte');
}

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

test('an empty manifest writes deterministic outputs twice without starting Python inspection', async () => {
  const fixture = createFixture({ withModel: false });
  try {
    let inspections = 0;
    const inspectModel = async () => { inspections += 1; throw new Error('empty sync must not inspect'); };
    await sync(fixture, { inspectModel });
    const first = await snapshotOutputs(fixture.appDir);
    await sync(fixture, { inspectModel });
    assert.deepEqual(await snapshotOutputs(fixture.appDir), first);
    assert.equal(inspections, 0);
    assert.deepEqual(JSON.parse(readFileSync(outputPaths(fixture.appDir)[3][1], 'utf8')), {
      manifest_version: 1,
      validation_status: 'build_validated',
      inference_status: 'unverified',
      models: [],
    });
  } finally {
    cleanup(fixture);
  }
});

test('a valid injected inspector result publishes one matched build-validated model set', async () => {
  const fixture = createFixture();
  try {
    let inspected;
    await sync(fixture, { inspectModel: async (filePath, model) => { inspected = { filePath, model }; return inspectorDetails(); } });
    assert.equal(inspected.model.id, 'fruit_detector');
    assert.equal(readFileSync(join(fixture.appDir, 'assets', 'models', MODEL_FILE)).toString(), SOURCE_BYTES.toString());
    const generatedMap = readFileSync(outputPaths(fixture.appDir)[1][1], 'utf8');
    assert.ok(generatedMap.includes(`'${MODEL_FILE}': require('../../../assets/models/${MODEL_FILE}')`));
    assert.deepEqual(JSON.parse(readFileSync(outputPaths(fixture.appDir)[2][1], 'utf8')), fixture.manifest);
    const verified = JSON.parse(readFileSync(outputPaths(fixture.appDir)[3][1], 'utf8'));
    assert.equal(verified.validation_status, 'build_validated');
    assert.equal(verified.inference_status, 'unverified');
    assert.equal(verified.models.length, 1);
    assert.equal(verified.models[0].sha256, hash(SOURCE_BYTES));
    assert.equal(verified.models[0].id, 'fruit_detector');
    assert.deepEqual(verified.models[0].signatures, [SIGNATURE]);
  } finally {
    cleanup(fixture);
  }
});

test('a missing declared artifact fails and preserves all prior generated outputs', async () => {
  const fixture = createFixture();
  try {
    rmSync(join(fixture.modelsDir, MODEL_FILE));
    await assertFailurePreserves(fixture, () => sync(fixture), /fruit_detector.*fixture-model\.tflite.*missing/i);
  } finally {
    cleanup(fixture);
  }
});

test('a SHA-256 mismatch names the model and hash field, then preserves all outputs', async () => {
  const fixture = createFixture();
  try {
    const bad = clone(fixture.manifest);
    const approval = clone(fixture.approvals);
    bad.models[0].sha256 = '0'.repeat(64);
    approval.approvals[0].sha256 = '0'.repeat(64);
    await writeContracts(fixture, bad, approval);
    await assertFailurePreserves(fixture, () => sync(fixture), /fruit_detector.*sha256/i);
  } finally {
    cleanup(fixture);
  }
});

test('a corrupt model reported by the injected inspector fails and preserves all outputs', async () => {
  const fixture = createFixture();
  try {
    await assertFailurePreserves(
      fixture,
      () => sync(fixture, { inspectModel: async () => { throw new Error('invalid FlatBuffer header'); } }),
      /fruit_detector.*invalid FlatBuffer header/i,
    );
  } finally {
    cleanup(fixture);
  }
});

for (const [field, mutate, message] of [
  ['tensor name', detail => { detail.name = 'unexpected'; }, /fruit_detector.*input.*name/i],
  ['tensor shape', detail => { detail.shapeSignature = [1, 112, 112, 3]; }, /fruit_detector.*input.*shape/i],
  ['tensor dtype', detail => { detail.dtype = 'uint8'; }, /fruit_detector.*input.*dtype/i],
]) {
  test(`an inspected ${field} mismatch fails and preserves all outputs`, async () => {
    const fixture = createFixture();
    try {
      const actual = inspectorDetails();
      mutate(actual.inputs[0]);
      await assertFailurePreserves(fixture, () => sync(fixture, { inspectModel: async () => actual }), message);
    } finally {
      cleanup(fixture);
    }
  });
}

test('an inspected signature key or binding mismatch fails and preserves all outputs', async () => {
  const fixture = createFixture();
  try {
    const actual = inspectorDetails();
    actual.signatures[0].inputs.image = 'unexpected_tensor';
    await assertFailurePreserves(fixture, () => sync(fixture, { inspectModel: async () => actual }), /fruit_detector.*signature/i);
  } finally {
    cleanup(fixture);
  }
});

test('a version or owner-approval mismatch fails and preserves all outputs', async () => {
  const fixture = createFixture();
  try {
    const approval = clone(fixture.approvals);
    approval.approvals[0].version = '2.0.0';
    await writeContracts(fixture, fixture.manifest, approval);
    await assertFailurePreserves(fixture, () => sync(fixture), /fruit_detector.*approval.*match/i);
  } finally {
    cleanup(fixture);
  }
});

test('an unavailable inspector fails closed and preserves all outputs', async () => {
  const fixture = createFixture();
  try {
    await assertFailurePreserves(
      fixture,
      () => sync(fixture, { inspectModel: async () => { throw new Error('Python 3.12 or ai-edge-litert is unavailable'); } }),
      /fruit_detector.*Python 3\.12 or ai-edge-litert is unavailable/i,
    );
  } finally {
    cleanup(fixture);
  }
});

test('a failing inspector exits before publication and preserves all outputs', async () => {
  const fixture = createFixture();
  try {
    await assertFailurePreserves(
      fixture,
      () => sync(fixture, { inspectModel: async () => { throw new Error('inspector returned nonzero exit'); } }),
      /fruit_detector.*inspector returned nonzero exit/i,
    );
  } finally {
    cleanup(fixture);
  }
});

test('an unlisted .tflite file is rejected and preserves all outputs', async () => {
  const fixture = createFixture();
  try {
    writeFileSync(join(fixture.modelsDir, 'unlisted.tflite'), Buffer.from('unlisted temporary bytes'));
    await assertFailurePreserves(fixture, () => sync(fixture), /unlisted.*unlisted\.tflite/i);
  } finally {
    cleanup(fixture);
  }
});

test('an artifact symlink that escapes models/ is rejected and preserves all outputs', async t => {
  const fixture = createFixture();
  try {
    const outside = join(fixture.root, 'outside-model-directory');
    mkdirSync(outside, { recursive: true });
    rmSync(join(fixture.modelsDir, MODEL_FILE));
    try {
      symlinkSync(outside, join(fixture.modelsDir, MODEL_FILE), 'junction');
    } catch (error) {
      if (process.platform === 'win32' && ['EPERM', 'EACCES', 'UNKNOWN', 'EINVAL'].includes(error.code)) {
        t.skip(`directory junction creation is unavailable in this Windows environment: ${error.code}`);
        return;
      }
      throw error;
    }
    await assertFailurePreserves(fixture, () => sync(fixture), /fruit_detector.*models|symlink|escape|regular file/i);
  } finally {
    cleanup(fixture);
  }
});

test('a copy failure during staging leaves all prior outputs untouched', async () => {
  const fixture = createFixture();
  try {
    await assertFailurePreserves(
      fixture,
      () => sync(fixture, { copyFile: async () => { throw new Error('injected staging copy failure'); } }),
      /copy.*failure/i,
    );
  } finally {
    cleanup(fixture);
  }
});

for (const step of ['assets', 'bundledModels', 'manifest', 'verifiedModels']) {
  test(`failure after publishing ${step} rolls back all four outputs byte-for-byte`, async () => {
    const fixture = createFixture();
    try {
      await assertFailurePreserves(
        fixture,
        () => sync(fixture, { afterPublishStep: async name => { if (name === step) throw new Error(`injected publish failure at ${name}`); } }),
        new RegExp(`injected publish failure at ${step}`, 'i'),
      );
    } finally {
      cleanup(fixture);
    }
  });
}

test('the production CLI invokes the real inspector for a nonempty import and retains prior outputs on failure', async () => {
  const fixture = createFixture();
  const harnessScripts = join(fixture.root, 'scripts');
  mkdirSync(harnessScripts, { recursive: true });
  copyFileSync(join(SCRIPT_DIR, 'sync-models.mjs'), join(harnessScripts, 'sync-models.mjs'));
  copyFileSync(join(SCRIPT_DIR, 'model-contract.mjs'), join(harnessScripts, 'model-contract.mjs'));
  copyFileSync(join(SCRIPT_DIR, 'inspect-tflite.py'), join(harnessScripts, 'inspect-tflite.py'));
  try {
    const before = await snapshotOutputs(fixture.appDir);
    const result = spawnSync(process.execPath, [join(harnessScripts, 'sync-models.mjs')], {
      cwd: fixture.root,
      encoding: 'utf8',
      timeout: 45_000,
      windowsHide: true,
    });
    assert.notEqual(result.status, 0, 'invalid test bytes cannot pass real LiteRT inspection');
    assert.match(`${result.stderr}\n${result.stdout}`, /LiteRT|ai-edge-litert|inspect|model/i);
    assert.deepEqual(await snapshotOutputs(fixture.appDir), before);
  } finally {
    cleanup(fixture);
  }
});
