import type { Manifest, ModelEntry } from './manifest';

export type ModelState = 'ready' | 'missing' | 'checksum_mismatch';

export interface ModelStatus {
  id: string;
  stage: number;
  state: ModelState;
  source: 'bundled' | 'device' | null;
  version: string | null;
  /** False when no checksum was computed for this file. Never blocks loading. */
  verified: boolean;
}

function resolveOne(
  entry: ModelEntry,
  bundled: Record<string, number>,
  checksums: Record<string, string>,
): ModelStatus {
  const base = { id: entry.id, stage: entry.stage, version: entry.version };
  if (!(entry.file in bundled)) {
    return { ...base, state: 'missing', source: null, verified: false };
  }
  const actual = checksums[entry.file];
  if (actual === undefined) {
    // Hashing a bundled asset needs expo-file-system and expo-crypto, which the
    // detection plan introduces. Until then a bundled file is trusted but flagged
    // unverified, so an absent hash can never be mistaken for a corrupt model.
    return { ...base, state: 'ready', source: 'bundled', verified: false };
  }
  if (actual !== entry.sha256) {
    return { ...base, state: 'checksum_mismatch', source: null, verified: false };
  }
  return { ...base, state: 'ready', source: 'bundled', verified: true };
}

export function resolveModels(
  manifest: Manifest,
  bundled: Record<string, number>,
  checksums: Record<string, string>,
): ModelStatus[] {
  return manifest.models.map(m => resolveOne(m, bundled, checksums));
}

/** Highest contiguous stage that can run. A gap stops the pipeline. */
export function pipelineDepth(statuses: ModelStatus[]): 0 | 1 | 2 | 3 {
  const ready = (stage: number) => statuses.some(s => s.stage === stage && s.state === 'ready');
  if (!ready(1)) return 0;
  if (!ready(2)) return 1;
  if (!ready(3)) return 2;
  return 3;
}
