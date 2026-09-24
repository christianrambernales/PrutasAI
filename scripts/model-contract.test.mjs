import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelContract } from './model-contract.mjs';

const FRUITS = ['banana', 'mango', 'papaya'];
const ROLE_FRUITS = {
  fruit_detector: FRUITS,
  variety_banana: ['banana'],
  variety_mango: ['mango'],
  variety_papaya: ['papaya'],
  disease_detector: FRUITS,
};

// These deliberately synthetic values exist only to exercise the contract.
// They are not owner approval, production tensor dimensions, labels, hashes, or
// model versions. No .tflite artifact is created or implied by these fixtures.
function entryFor(id, suffix = 'test-fixture') {
  return {
    id,
    file: `${id}_${suffix}.tflite`,
    version: 'fixture-version-1',
    sha256: 'a'.repeat(64),
    fruits: [...ROLE_FRUITS[id]],
    min_confidence: 0.5,
  };
}

function approvalFor(entry) {
  return {
    id: entry.id,
    file: entry.file,
    version: entry.version,
    sha256: entry.sha256,
    fruits: [...entry.fruits],
    min_confidence: entry.min_confidence,
    status: 'owner_approved',
    approved_by: 'Test fixture only; not an owner',
    approved_at: '2026-09-24T00:00:00.000Z',
    inputs: [{ name: 'fixture_input', shape: [1], dtype: 'float32' }],
    outputs: [{ name: 'fixture_output', shape: [1], dtype: 'float32' }],
    label_mapping: {
      output_name: 'fixture_output',
      index_to_label: ['fixture_label_only'],
    },
  };
}

function contractFor(entries) {
  return {
    manifest: { manifest_version: 1, models: entries },
    approvals: { schema_version: 1, approvals: entries.map(approvalFor) },
  };
}

function assertCode(code, manifest, approvals) {
  assert.throws(
    () => parseModelContract(manifest, approvals),
    error => error?.code === code,
    `expected validation error code ${code}`,
  );
}

test('accepts the empty model-free source manifest and empty approval registry', () => {
  const result = parseModelContract(
    '{"manifest_version":1,"models":[]}',
    '{"schema_version":1,"approvals":[]}',
  );
  assert.deepEqual(result, { manifest_version: 1, models: [] });
});

test('accepts each of the five explicit role IDs with its fruit applicability', () => {
  const entries = Object.keys(ROLE_FRUITS).map(id => entryFor(id));
  const { manifest, approvals } = contractFor(entries);

  const result = parseModelContract(manifest, approvals);

  assert.deepEqual(result.models.map(model => model.id), Object.keys(ROLE_FRUITS));
  for (const model of result.models) {
    assert.deepEqual(model.fruits, ROLE_FRUITS[model.id]);
  }
});

test('rejects an unknown role ID and unknown fruit with named errors', () => {
  const unknownRole = entryFor('fruit_detector');
  unknownRole.id = 'unapproved_detector';
  const unknownRoleContract = contractFor([unknownRole]);
  assertCode('UNKNOWN_ROLE', unknownRoleContract.manifest, unknownRoleContract.approvals);

  const unknownFruit = entryFor('fruit_detector');
  unknownFruit.fruits = ['banana', 'durian'];
  const unknownFruitContract = contractFor([unknownFruit]);
  assertCode('UNKNOWN_FRUIT', unknownFruitContract.manifest, unknownFruitContract.approvals);
});

test('requires fruit-specific variety roles to declare only their supported fruit', () => {
  const entry = entryFor('variety_banana');
  entry.fruits = ['mango'];
  const { manifest, approvals } = contractFor([entry]);

  assertCode('ROLE_FRUIT_MISMATCH', manifest, approvals);
});

test('rejects unsafe filenames and non-tflite basenames before any file access', () => {
  for (const file of ['../outside.tflite', 'folder/model.tflite', 'folder\\model.tflite', 'model.bin']) {
    const entry = entryFor('fruit_detector');
    entry.file = file;
    const { manifest, approvals } = contractFor([entry]);
    assertCode('UNSAFE_FILENAME', manifest, approvals);
  }
});

test('rejects duplicate role IDs and duplicate model filenames', () => {
  const duplicateId = [entryFor('fruit_detector', 'one'), entryFor('fruit_detector', 'two')];
  let contract = contractFor(duplicateId);
  assertCode('DUPLICATE_ID', contract.manifest, contract.approvals);

  const duplicateFile = [entryFor('fruit_detector'), entryFor('disease_detector')];
  duplicateFile[1].file = duplicateFile[0].file;
  contract = contractFor(duplicateFile);
  assertCode('DUPLICATE_FILE', contract.manifest, contract.approvals);
});

test('requires a real non-placeholder version and a 64-hex SHA-256', () => {
  for (const version of ['', 'pending', 'TBD', 'unknown']) {
    const entry = entryFor('fruit_detector');
    entry.version = version;
    const { manifest, approvals } = contractFor([entry]);
    assertCode('INVALID_VERSION', manifest, approvals);
  }

  const entry = entryFor('fruit_detector');
  entry.sha256 = 'not-a-sha256';
  const { manifest, approvals } = contractFor([entry]);
  assertCode('INVALID_SHA256', manifest, approvals);
});

test('requires a finite confidence threshold within the inclusive zero-to-one range', () => {
  for (const threshold of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    const entry = entryFor('fruit_detector');
    entry.min_confidence = threshold;
    const { manifest, approvals } = contractFor([entry]);
    assertCode('INVALID_MIN_CONFIDENCE', manifest, approvals);
  }
});

test('requires nonempty input and output tensor names, dimensions, and supported dtypes', () => {
  const mutations = [
    approval => { approval.inputs = []; },
    approval => { approval.inputs[0].name = ''; },
    approval => { approval.inputs[0].shape = []; },
    approval => { approval.inputs[0].shape = [0]; },
    approval => { approval.inputs[0].dtype = ''; },
    approval => { approval.outputs = []; },
    approval => { approval.outputs[0].name = ''; },
    approval => { approval.outputs[0].shape = []; },
    approval => { approval.outputs[0].shape = ['unknown']; },
    approval => { approval.outputs[0].dtype = 'unknown'; },
  ];

  for (const mutate of mutations) {
    const entry = entryFor('fruit_detector');
    const { manifest, approvals } = contractFor([entry]);
    mutate(approvals.approvals[0]);
    assertCode('INVALID_TENSOR_CONTRACT', manifest, approvals);
  }
});

test('requires label mapping semantics to reference a declared output tensor', () => {
  const entry = entryFor('fruit_detector');
  const { manifest, approvals } = contractFor([entry]);
  approvals.approvals[0].label_mapping.output_name = 'missing_output';

  assertCode('INVALID_LABEL_MAPPING', manifest, approvals);
});

test('requires a separate owner-approved record bound to role, file, version, and hash', () => {
  const entry = entryFor('fruit_detector');
  let { manifest, approvals } = contractFor([entry]);
  approvals.approvals = [];
  assertCode('MISSING_APPROVAL', manifest, approvals);

  ({ manifest, approvals } = contractFor([entry]));
  approvals.approvals[0].status = 'draft';
  assertCode('APPROVAL_NOT_OWNER_APPROVED', manifest, approvals);

  ({ manifest, approvals } = contractFor([entry]));
  approvals.approvals[0].version = 'different-fixture-version';
  assertCode('APPROVAL_MISMATCH', manifest, approvals);

  ({ manifest, approvals } = contractFor([entry]));
  approvals.approvals[0].sha256 = 'b'.repeat(64);
  assertCode('APPROVAL_MISMATCH', manifest, approvals);
});

test('rejects malformed JSON and unsupported source contract versions', () => {
  assertCode('INVALID_JSON', '{malformed', '{"schema_version":1,"approvals":[]}');
  assertCode(
    'UNSUPPORTED_MANIFEST_VERSION',
    { manifest_version: 2, models: [] },
    { schema_version: 1, approvals: [] },
  );
});
