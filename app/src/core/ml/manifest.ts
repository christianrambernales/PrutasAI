export interface ModelEntry {
  id: string;
  stage: number;
  file: string;
  sha256: string;
  version: string;
  min_confidence: number;
}

export interface Manifest {
  manifest_version: number;
  models: ModelEntry[];
}
