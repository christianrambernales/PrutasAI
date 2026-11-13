import type { Manifest, ModelEntry, ModelRoleId, SupportedFruit, VerifiedModels } from './manifest';

export type ModelState = 'ready' | 'missing' | 'checksum_mismatch';

export interface ModelStatus {
  id: string;
  stage: number;
  state: ModelState;
  source: 'bundled' | 'device' | null;
  version: string | null;
  /** True only when generated build metadata matches the source manifest. */
  verified: boolean;
  note?: string;
}

export interface FruitModelProjection {
  /** Roles whose files passed generated build validation for this fruit. */
  validatedRoles: ModelRoleId[];
  /** Validated roles in order, stopping at the first missing prerequisite. */
  prerequisiteValidatedRoles: ModelRoleId[];
}

export interface ModelRegistry {
  models: ModelStatus[];
  fruits: Record<SupportedFruit, FruitModelProjection>;
  /** File validation never proves that the application ran a model. */
  inferenceVerified: false;
  /** No inference runner or device proof is part of this phase. */
  canRunInference: false;
}

const FRUITS: SupportedFruit[] = ['banana', 'mango', 'papaya'];
const ROLE_IDS: ModelRoleId[] = [
  'fruit_detector', 'variety_banana', 'variety_mango', 'variety_papaya', 'disease_detector',
];

function varietyRoleForFruit(fruit: SupportedFruit): ModelRoleId {
  return `variety_${fruit}` as ModelRoleId;
}

function roleAppliesToFruit(entry: ModelEntry, fruit: SupportedFruit): boolean {
  if (entry.id === 'fruit_detector' || entry.id === 'disease_detector') {
    return entry.fruits?.includes(fruit) === true;
  }
  return entry.id === varietyRoleForFruit(fruit) && entry.fruits?.includes(fruit) === true;
}

function hasSameFruits(source: ModelEntry, generated: VerifiedModels['models'][number]): boolean {
  if (!Array.isArray(source.fruits) || !Array.isArray(generated.fruits)) return false;
  if (source.fruits.some(fruit => !FRUITS.includes(fruit))) return false;
  if (generated.fruits.some(fruit => !FRUITS.includes(fruit))) return false;
  return source.fruits.length === generated.fruits.length
    && source.fruits.every(fruit => generated.fruits.includes(fruit));
}

function isKnownRole(id: string): id is ModelRoleId {
  return ROLE_IDS.includes(id as ModelRoleId);
}

function invalidStatus(entry: ModelEntry, state: ModelState, note: string): ModelStatus {
  return {
    id: entry.id,
    stage: entry.stage,
    state,
    source: null,
    version: entry.version || null,
    verified: false,
    note,
  };
}

function resolveOne(
  entry: ModelEntry,
  bundled: Record<string, number>,
  verified: VerifiedModels | undefined,
  duplicateVerifiedId: boolean,
  manifestMatches: boolean,
): ModelStatus {
  const assetIsBundled = Object.prototype.hasOwnProperty.call(bundled, entry.file);
  if (!assetIsBundled) {
    return invalidStatus(entry, 'missing', 'The declared model file is not in the generated app bundle.');
  }

  if (!verified || !Array.isArray(verified.models)
    || verified.validation_status !== 'build_validated' || verified.inference_status !== 'unverified') {
    return invalidStatus(entry, 'missing', 'Generated model verification metadata is missing or invalid.');
  }
  if (!manifestMatches) {
    return invalidStatus(entry, 'checksum_mismatch', 'Generated metadata was built from a different manifest version.');
  }

  const records = verified.models.filter(model => model.id === entry.id);
  if (duplicateVerifiedId || records.length > 1) {
    return invalidStatus(entry, 'checksum_mismatch', 'Generated metadata contains duplicate role records.');
  }
  const generated = records[0];
  if (!generated) {
    return invalidStatus(entry, 'missing', 'Generated verification metadata has no record for this role.');
  }
  if (!isKnownRole(entry.id) || generated.id !== entry.id || generated.stage !== entry.stage) {
    return invalidStatus(entry, 'checksum_mismatch', 'Generated role metadata does not match the source manifest.');
  }
  if (generated.file !== entry.file || generated.version !== entry.version || !hasSameFruits(entry, generated)) {
    return invalidStatus(entry, 'checksum_mismatch', 'Generated file, version, or fruit scope does not match the source manifest.');
  }
  if (!entry.sha256 || generated.sha256 !== entry.sha256) {
    return invalidStatus(entry, 'checksum_mismatch', 'Generated SHA-256 does not match the source manifest.');
  }

  return {
    id: entry.id,
    stage: entry.stage,
    state: 'ready',
    source: 'bundled',
    version: entry.version,
    verified: true,
  };
}

export function resolveModels(
  manifest: Manifest,
  bundled: Record<string, number>,
  verified?: VerifiedModels | null,
): ModelStatus[] {
  const verifiedModels = verified && Array.isArray(verified.models) ? verified.models : [];
  const ids = verifiedModels.map(model => model.id);
  const duplicateIds = new Set(ids.filter((id, index) => ids.indexOf(id) !== index));
  const manifestMatches = Boolean(verified) && verified?.manifest_version === manifest.manifest_version;

  return manifest.models.map(entry => resolveOne(
    entry,
    bundled,
    verified ?? undefined,
    duplicateIds.has(entry.id),
    manifestMatches,
  ));
}

function projectFruit(
  fruit: SupportedFruit,
  manifest: Manifest,
  statuses: ModelStatus[],
): FruitModelProjection {
  const roleChain: ModelRoleId[] = ['fruit_detector', varietyRoleForFruit(fruit), 'disease_detector'];
  const isValidated = (role: ModelRoleId) => manifest.models.some((entry, index) =>
    entry.id === role && roleAppliesToFruit(entry, fruit) && statuses[index]?.state === 'ready',
  );
  const validatedRoles = roleChain.filter(isValidated);
  const prerequisiteValidatedRoles: ModelRoleId[] = [];
  for (const role of roleChain) {
    if (!isValidated(role)) break;
    prerequisiteValidatedRoles.push(role);
  }
  return { validatedRoles, prerequisiteValidatedRoles };
}

export function resolveModelRegistry(
  manifest: Manifest,
  bundled: Record<string, number>,
  verified?: VerifiedModels | null,
): ModelRegistry {
  const models = resolveModels(manifest, bundled, verified);
  return {
    models,
    fruits: {
      banana: projectFruit('banana', manifest, models),
      mango: projectFruit('mango', manifest, models),
      papaya: projectFruit('papaya', manifest, models),
    },
    inferenceVerified: false,
    canRunInference: false,
  };
}

/** Compatibility value for chat and existing views: file validation is not an executable stage. */
export function pipelineDepth(_statuses: ModelStatus[]): 0 {
  return 0;
}
