import React from 'react';
import { describeDetectionCapability } from '../../core/status';
import { bundledModels } from '../../core/ml/bundledModels';
import manifest from '../../core/ml/manifest.json';
import { pipelineDepth, resolveModels } from '../../core/ml/registry';
import type { ModelRow } from '../viewModels';
import { ModelStatusView } from './ModelStatusView';

/**
 * Reads the real registry — never preview data. If no weights are installed
 * this screen says so, which is the whole point of it existing.
 */
export function ModelStatusScreen({ onImportModel }: { onImportModel?: () => void }) {
  const statuses = resolveModels(manifest, bundledModels, {});
  const capability = describeDetectionCapability(statuses);

  const models: ModelRow[] = statuses.map(s => ({
    id: s.id,
    stage: s.stage,
    state: s.state,
    source: s.source,
    version: s.version,
    verified: s.verified,
  }));

  return (
    <ModelStatusView
      headline={capability.headline}
      detail={capability.detail}
      depth={pipelineDepth(statuses)}
      models={models}
      manifestVersion={manifest.manifest_version}
      onImportModel={onImportModel ?? (() => {})}
    />
  );
}
