import React from 'react';
import { describeDetectionCapability } from '../../core/status';
import { bundledModels } from '../../core/ml/bundledModels';
import manifest from '../../core/ml/manifest.json';
import verifiedModels from '../../core/ml/verifiedModels.json';
import { resolveModelRegistry } from '../../core/ml/registry';
import type { ModelRow } from '../viewModels';
import { ModelStatusView } from './ModelStatusView';

/**
 * Reads the real registry — never preview data. If no weights are installed
 * this screen says so, which is the whole point of it existing.
 */
export function ModelStatusScreen({ onImportModel }: { onImportModel?: () => void }) {
  const registry = resolveModelRegistry(manifest, bundledModels, verifiedModels);
  const capability = describeDetectionCapability(registry);

  const models: ModelRow[] = registry.models.map(s => ({
    id: s.id,
    stage: s.stage,
    state: s.state,
    source: s.source,
    version: s.version,
    verified: s.verified,
    note: s.note,
  }));

  return (
    <ModelStatusView
      headline={capability.headline}
      detail={capability.detail}
      depth={capability.depth}
      models={models}
      manifestVersion={manifest.manifest_version}
      onImportModel={onImportModel ?? (() => {})}
    />
  );
}
