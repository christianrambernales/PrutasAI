const FRUITS = new Set(['banana', 'mango', 'papaya']);
const ROLES = {
  fruit_detector: { stage: 1, fruits: FRUITS },
  variety_banana: { stage: 2, fruits: new Set(['banana']) },
  variety_mango: { stage: 2, fruits: new Set(['mango']) },
  variety_papaya: { stage: 2, fruits: new Set(['papaya']) },
  disease_detector: { stage: 3, fruits: FRUITS },
};
const DTYPES = new Set([
  'bfloat16', 'bool', 'complex128', 'complex64', 'float16', 'float32', 'float64',
  'int4', 'int8', 'int16', 'int32', 'int64', 'string', 'uint4', 'uint8', 'uint16',
  'uint32', 'uint64',
]);
const PLACEHOLDER = /^(?:tbd|pending|unknown|n\/?a|none|null|placeholder|todo|changeme|example)(?:$|[\s_-])/i;

export class ModelContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ModelContractError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new ModelContractError(code, message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function decode(value, label) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    fail('INVALID_JSON', `${label} must contain valid JSON.`);
  }
}

function assertKeys(value, allowed, label, code) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(code, `${label} contains unsupported field "${key}".`);
  }
}

function requireString(value, code, field, { placeholder = false } = {}) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 256 || /[\u0000-\u001f]/.test(value)) {
    fail(code, `${field} must be a nonempty string.`);
  }
  if (placeholder && PLACEHOLDER.test(value.trim())) {
    fail(code, `${field} cannot use a placeholder value.`);
  }
  return value.trim();
}

function validateFile(file, field = 'file') {
  const basename = requireString(file, 'UNSAFE_FILENAME', field);
  const stem = basename.slice(0, -'.tflite'.length);
  const windowsDeviceName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (
    basename !== file ||
    basename.includes('/') ||
    basename.includes('\\') ||
    basename.includes('..') ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*\.tflite$/.test(basename) ||
    windowsDeviceName.test(stem)
  ) {
    fail('UNSAFE_FILENAME', `${field} must be a safe .tflite basename inside models/.`);
  }
  return basename;
}

function validateVersion(version, field = 'version') {
  const value = requireString(version, 'INVALID_VERSION', field, { placeholder: true });
  if (!/^[A-Za-z0-9][A-Za-z0-9.+_-]*$/.test(value)) {
    fail('INVALID_VERSION', `${field} must be a concrete version without whitespace or path syntax.`);
  }
  return value;
}

function validateHash(hash, field = 'sha256') {
  const value = requireString(hash, 'INVALID_SHA256', field);
  if (!/^[a-f\d]{64}$/i.test(value)) {
    fail('INVALID_SHA256', `${field} must contain exactly 64 hexadecimal characters.`);
  }
  return value.toLowerCase();
}

function validateConfidence(value, field = 'min_confidence') {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    fail('INVALID_MIN_CONFIDENCE', `${field} must be a finite number from 0 through 1.`);
  }
  return value;
}

function validateFruits(value, roleId, field = 'fruits') {
  if (!Array.isArray(value) || value.length === 0 || value.some(fruit => typeof fruit !== 'string')) {
    fail('INVALID_FRUIT_APPLICABILITY', `${field} must explicitly list at least one supported fruit.`);
  }
  const seen = new Set();
  for (const fruit of value) {
    if (!FRUITS.has(fruit)) fail('UNKNOWN_FRUIT', `${field} contains unsupported fruit "${fruit}".`);
    if (seen.has(fruit)) fail('INVALID_FRUIT_APPLICABILITY', `${field} contains duplicate fruit "${fruit}".`);
    seen.add(fruit);
    if (!ROLES[roleId]?.fruits.has(fruit)) {
      fail('ROLE_FRUIT_MISMATCH', `${roleId} cannot declare applicability to ${fruit}.`);
    }
  }
  return [...value];
}

function validateTensorList(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    fail('INVALID_TENSOR_CONTRACT', `${field} must declare at least one tensor.`);
  }
  const names = new Set();
  return value.map((tensor, index) => {
    const tensorField = `${field}[${index}]`;
    if (!isRecord(tensor)) fail('INVALID_TENSOR_CONTRACT', `${tensorField} must be an object.`);
    assertKeys(tensor, new Set(['name', 'shape', 'dtype']), tensorField, 'INVALID_TENSOR_CONTRACT');
    const name = requireString(tensor.name, 'INVALID_TENSOR_CONTRACT', `${tensorField}.name`, { placeholder: true });
    if (names.has(name)) fail('INVALID_TENSOR_CONTRACT', `${field} contains duplicate tensor name "${name}".`);
    names.add(name);
    if (
      !Array.isArray(tensor.shape) ||
      tensor.shape.length === 0 ||
      tensor.shape.some(dimension => !Number.isInteger(dimension) || (dimension !== -1 && dimension <= 0))
    ) {
      fail('INVALID_TENSOR_CONTRACT', `${tensorField}.shape must contain explicit positive integer dimensions or -1 for a dynamic dimension.`);
    }
    if (typeof tensor.dtype !== 'string' || !DTYPES.has(tensor.dtype)) {
      fail('INVALID_TENSOR_CONTRACT', `${tensorField}.dtype must be a supported tensor dtype.`);
    }
    return { name, shape: [...tensor.shape], dtype: tensor.dtype };
  });
}

function validateLabelMapping(value, outputs) {
  if (!isRecord(value)) fail('INVALID_LABEL_MAPPING', 'label_mapping must specify its output tensor and index-to-label mapping.');
  assertKeys(value, new Set(['output_name', 'index_to_label']), 'label_mapping', 'INVALID_LABEL_MAPPING');
  const outputName = requireString(value.output_name, 'INVALID_LABEL_MAPPING', 'label_mapping.output_name', { placeholder: true });
  if (!outputs.some(output => output.name === outputName)) {
    fail('INVALID_LABEL_MAPPING', 'label_mapping.output_name must match a declared output tensor.');
  }
  if (
    !Array.isArray(value.index_to_label) ||
    value.index_to_label.length === 0 ||
    value.index_to_label.some(label => typeof label !== 'string' || label.trim().length === 0 || PLACEHOLDER.test(label.trim()))
  ) {
    fail('INVALID_LABEL_MAPPING', 'label_mapping.index_to_label must provide nonempty owner-supplied labels.');
  }
  if (new Set(value.index_to_label.map(label => label.trim())).size !== value.index_to_label.length) {
    fail('INVALID_LABEL_MAPPING', 'label_mapping.index_to_label cannot contain duplicate labels.');
  }
  return { output_name: outputName, index_to_label: value.index_to_label.map(label => label.trim()) };
}

function validateSignatureToken(value, field, code = 'INVALID_SIGNATURES') {
  const token = requireString(value, code, field);
  if (
    token !== value ||
    !/^[A-Za-z_][A-Za-z0-9._:/@+-]{0,255}$/.test(token) ||
    ['__proto__', 'constructor', 'prototype'].includes(token)
  ) {
    fail(code, `${field} must be a safe nonempty signature identifier.`);
  }
  return token;
}

function validateSignatureBindings(value, tensorNames, field) {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    fail('INVALID_SIGNATURE_BINDING', `${field} must map at least one alias to an approved tensor name.`);
  }
  const aliases = new Set();
  const names = new Set();
  const bindings = {};
  for (const [rawAlias, rawTensorName] of Object.entries(value)) {
    const alias = validateSignatureToken(rawAlias, `${field} alias`, 'INVALID_SIGNATURE_BINDING');
    const tensorName = validateSignatureToken(rawTensorName, `${field}.${alias}`, 'INVALID_SIGNATURE_BINDING');
    if (aliases.has(alias)) {
      fail('DUPLICATE_SIGNATURE_BINDING', `${field} contains duplicate alias "${alias}".`);
    }
    if (names.has(tensorName)) {
      fail('DUPLICATE_SIGNATURE_BINDING', `${field} binds tensor "${tensorName}" more than once.`);
    }
    if (!tensorNames.has(tensorName)) {
      fail('INVALID_SIGNATURE_BINDING', `${field}.${alias} must reference an approved tensor detail name.`);
    }
    aliases.add(alias);
    names.add(tensorName);
    bindings[alias] = tensorName;
  }
  return bindings;
}

function validateSignatures(value, inputs, outputs, field) {
  if (!Array.isArray(value)) {
    fail('INVALID_SIGNATURES', `${field} must be an explicit array; use [] only when the model has no signatures.`);
  }
  const keys = new Set();
  const inputNames = new Set(inputs.map(tensor => tensor.name));
  const outputNames = new Set(outputs.map(tensor => tensor.name));
  return value.map((signature, index) => {
    const signatureField = `${field}[${index}]`;
    if (!isRecord(signature)) fail('INVALID_SIGNATURES', `${signatureField} must be an object.`);
    assertKeys(signature, new Set(['key', 'inputs', 'outputs']), signatureField, 'INVALID_SIGNATURES');
    const key = validateSignatureToken(signature.key, `${signatureField}.key`);
    if (keys.has(key)) fail('DUPLICATE_SIGNATURE_KEY', `${field} contains duplicate signature key "${key}".`);
    keys.add(key);
    return {
      key,
      inputs: validateSignatureBindings(signature.inputs, inputNames, `${signatureField}.inputs`),
      outputs: validateSignatureBindings(signature.outputs, outputNames, `${signatureField}.outputs`),
    };
  });
}

function validateApproval(approval, index, seenIds, seenFiles) {
  const label = `approvals[${index}]`;
  if (!isRecord(approval)) fail('INVALID_APPROVAL', `${label} must be an object.`);
  const keys = new Set([
    'id', 'file', 'version', 'sha256', 'fruits', 'min_confidence', 'status',
    'approved_by', 'approved_at', 'inputs', 'outputs', 'label_mapping', 'signatures',
  ]);
  assertKeys(approval, keys, label, 'INVALID_APPROVAL');
  const id = requireString(approval.id, 'UNKNOWN_ROLE', `${label}.id`);
  if (!Object.hasOwn(ROLES, id)) fail('UNKNOWN_ROLE', `${label}.id names an unapproved role "${id}".`);
  const file = validateFile(approval.file, `${label}.file`);
  if (seenIds.has(id)) fail('DUPLICATE_APPROVAL_ID', `Approval registry contains duplicate role "${id}".`);
  if (seenFiles.has(file)) fail('DUPLICATE_APPROVAL_FILE', `Approval registry contains duplicate file "${file}".`);
  seenIds.add(id);
  seenFiles.add(file);
  const version = validateVersion(approval.version, `${label}.version`);
  const sha256 = validateHash(approval.sha256, `${label}.sha256`);
  const fruits = validateFruits(approval.fruits, id, `${label}.fruits`);
  const minConfidence = validateConfidence(approval.min_confidence, `${label}.min_confidence`);
  if (approval.status !== 'owner_approved') {
    fail('APPROVAL_NOT_OWNER_APPROVED', `${label}.status must be owner_approved.`);
  }
  requireString(approval.approved_by, 'APPROVAL_NOT_OWNER_APPROVED', `${label}.approved_by`, { placeholder: true });
  const approvedAt = requireString(approval.approved_at, 'APPROVAL_NOT_OWNER_APPROVED', `${label}.approved_at`);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(approvedAt) || !Number.isFinite(Date.parse(approvedAt))) {
    fail('APPROVAL_NOT_OWNER_APPROVED', `${label}.approved_at must be an ISO date-time.`);
  }
  const inputs = validateTensorList(approval.inputs, `${label}.inputs`);
  const outputs = validateTensorList(approval.outputs, `${label}.outputs`);
  const labelMapping = validateLabelMapping(approval.label_mapping, outputs);
  const signatures = validateSignatures(approval.signatures, inputs, outputs, `${label}.signatures`);
  return { id, file, version, sha256, fruits, min_confidence: minConfidence, inputs, outputs, label_mapping: labelMapping, signatures };
}

function parseModel(value) {
  if (!isRecord(value)) fail('INVALID_MANIFEST', 'Each models entry must be an object.');
  assertKeys(value, new Set(['id', 'stage', 'file', 'version', 'sha256', 'fruits', 'min_confidence']), 'models entry', 'INVALID_MANIFEST');
  const id = requireString(value.id, 'UNKNOWN_ROLE', 'models[].id');
  const role = ROLES[id];
  if (!role) fail('UNKNOWN_ROLE', `models[].id names an unapproved role "${id}".`);
  if (value.stage !== role.stage) fail('ROLE_STAGE_MISMATCH', `${id}.stage must be ${role.stage}.`);
  return {
    id,
    stage: role.stage,
    file: validateFile(value.file),
    version: validateVersion(value.version),
    sha256: validateHash(value.sha256),
    fruits: validateFruits(value.fruits, id),
    min_confidence: validateConfidence(value.min_confidence),
  };
}

/**
 * Parse and validate a source manifest against the separate owner approval
 * registry. This does not read files or claim that model bytes match SHA-256;
 * synchronization performs that artifact check.
 */
export function parseModelContract(manifestInput, approvalsInput) {
  const manifest = decode(manifestInput, 'manifest');
  const registry = decode(approvalsInput, 'approval registry');
  if (!isRecord(manifest)) fail('INVALID_MANIFEST', 'manifest must be an object.');
  assertKeys(manifest, new Set(['manifest_version', 'models']), 'manifest', 'INVALID_MANIFEST');
  if (manifest.manifest_version !== 1) {
    fail('UNSUPPORTED_MANIFEST_VERSION', 'manifest_version must be 1.');
  }
  if (!Array.isArray(manifest.models)) fail('INVALID_MANIFEST', 'manifest.models must be an array.');
  if (!isRecord(registry)) fail('INVALID_APPROVAL_REGISTRY', 'approval registry must be an object.');
  assertKeys(registry, new Set(['schema_version', 'approvals']), 'approval registry', 'INVALID_APPROVAL_REGISTRY');
  if (registry.schema_version !== 1 || !Array.isArray(registry.approvals)) {
    fail('INVALID_APPROVAL_REGISTRY', 'approval registry requires schema_version 1 and an approvals array.');
  }

  const models = manifest.models.map(parseModel);
  const modelIds = new Set();
  const modelFiles = new Set();
  for (const model of models) {
    if (modelIds.has(model.id)) fail('DUPLICATE_ID', `manifest contains duplicate role "${model.id}".`);
    if (modelFiles.has(model.file)) fail('DUPLICATE_FILE', `manifest contains duplicate file "${model.file}".`);
    modelIds.add(model.id);
    modelFiles.add(model.file);
  }

  const approvalIds = new Set();
  const approvalFiles = new Set();
  const approvals = registry.approvals.map((approval, index) =>
    validateApproval(approval, index, approvalIds, approvalFiles));
  const approvalById = new Map(approvals.map(approval => [approval.id, approval]));
  for (const model of models) {
    const approval = approvalById.get(model.id);
    if (!approval) fail('MISSING_APPROVAL', `No owner-approved record exists for role "${model.id}".`);
    const modelFruits = [...model.fruits].sort();
    const approvalFruits = [...approval.fruits].sort();
    const sameFruits = modelFruits.length === approvalFruits.length &&
      modelFruits.every((fruit, index) => fruit === approvalFruits[index]);
    if (
      model.file !== approval.file ||
      model.version !== approval.version ||
      model.sha256 !== approval.sha256 ||
      model.min_confidence !== approval.min_confidence ||
      !sameFruits
    ) {
      fail('APPROVAL_MISMATCH', `Owner approval for "${model.id}" must match the manifest file, version, SHA-256, fruits, and confidence threshold.`);
    }
  }

  return { manifest_version: 1, models };
}
