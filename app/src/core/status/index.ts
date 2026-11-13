import type { ModelRegistry } from '../ml/registry';

export interface DetectionCapability {
  /** Runtime inference depth, not the count of verified files. */
  depth: 0;
  headline: string;
  detail: string;
  fruits: ModelRegistry['fruits'];
  inferenceVerified: false;
  canRunInference: false;
}

export function describeDetectionCapability(registry: ModelRegistry): DetectionCapability {
  const hasValidatedFiles = registry.models.some(model => model.state === 'ready');
  return {
    depth: 0,
    headline: hasValidatedFiles ? 'Model files are installed and validated' : 'No validated model files are installed',
    detail: 'Model inference has not been verified on a device.',
    fruits: registry.fruits,
    inferenceVerified: false,
    canRunInference: false,
  };
}
