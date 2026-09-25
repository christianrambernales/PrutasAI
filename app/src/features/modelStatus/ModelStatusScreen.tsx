import React from 'react';
import { bundledModels } from '../../core/ml/bundledModels';
import manifest from '../../core/ml/manifest.json';
import type { Manifest } from '../../core/ml/manifest';
import verifiedModels from '../../core/ml/verifiedModels.json';
import { resolveModelRegistry } from '../../core/ml/registry';
import { strings, type Language } from '../../ui/i18n/strings';
import type { ModelRow } from '../viewModels';
import { ModelStatusView } from './ModelStatusView';

/**
 * Reads the real registry — never preview data. If no weights are installed
 * this screen says so, which is the whole point of it existing.
 */
export function ModelStatusScreen({ language = 'EN' }: { language?: Language }) {
  const sourceManifest = manifest as Manifest;
  const registry = resolveModelRegistry(sourceManifest, bundledModels, verifiedModels);
  const t = strings(language);

  const models: ModelRow[] = registry.models.map(s => ({
    id: s.id,
    stage: s.stage,
    state: s.state,
    source: s.source,
    version: s.version,
    verified: s.verified,
    fruits: sourceManifest.models.find(entry => entry.id === s.id)?.fruits,
    note: s.note,
  }));

  return (
    <ModelStatusView
      headline={models.some(model => model.state === 'ready') ? t.modelStatusValidatedHeadline : t.modelStatusEmptyHeadline}
      models={models}
      fruits={registry.fruits}
      manifestVersion={sourceManifest.manifest_version}
      t={t}
    />
  );
}
