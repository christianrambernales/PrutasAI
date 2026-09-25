export const MODEL_ROLE_IDS = [
  'fruit_detector',
  'variety_banana',
  'variety_mango',
  'variety_papaya',
  'disease_detector',
] as const;

export type ModelRoleId = typeof MODEL_ROLE_IDS[number];
export type SupportedFruit = 'banana' | 'mango' | 'papaya';
export type ModelStage = 1 | 2 | 3;
export type TensorDType =
  | 'bfloat16'
  | 'bool'
  | 'complex128'
  | 'complex64'
  | 'float16'
  | 'float32'
  | 'float64'
  | 'int4'
  | 'int8'
  | 'int16'
  | 'int32'
  | 'int64'
  | 'string'
  | 'uint4'
  | 'uint8'
  | 'uint16'
  | 'uint32'
  | 'uint64';

export interface ModelTensor {
  name: string;
  shape: number[];
  dtype: TensorDType;
}

export interface ModelSignature {
  key: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
}

export interface ModelEntry {
  id: string;
  stage: number;
  file: string;
  sha256: string;
  version: string;
  min_confidence: number;
  /** Present on validated source manifests; optional for existing app fixtures. */
  fruits?: SupportedFruit[];
}

/** Strict source-manifest type accepted by scripts/model-contract.mjs. */
export interface SourceModelEntry extends Omit<ModelEntry, 'fruits'> {
  id: ModelRoleId;
  stage: ModelStage;
  fruits: SupportedFruit[];
}

export interface SourceManifest {
  manifest_version: 1;
  models: SourceModelEntry[];
}

export interface ModelApprovalRecord {
  id: ModelRoleId;
  file: string;
  version: string;
  sha256: string;
  fruits: SupportedFruit[];
  min_confidence: number;
  status: 'owner_approved';
  approved_by: string;
  approved_at: string;
  inputs: ModelTensor[];
  outputs: ModelTensor[];
  signatures: ModelSignature[];
  label_mapping: {
    output_name: string;
    index_to_label: string[];
  };
}

export interface ModelApprovalRegistry {
  schema_version: 1;
  approvals: ModelApprovalRecord[];
}

export interface Manifest {
  manifest_version: number;
  models: ModelEntry[];
}

/** Build output from scripts/sync-models.mjs; this proves artifact validation only. */
export interface VerifiedModelMetadata {
  id: string;
  stage: number;
  file: string;
  version: string;
  sha256: string;
  fruits: SupportedFruit[];
}

/** Generated build-validation record. It does not establish inference readiness. */
export interface VerifiedModels {
  manifest_version: number;
  validation_status: string;
  inference_status: string;
  models: VerifiedModelMetadata[];
}
