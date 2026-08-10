import { pipelineDepth, type ModelStatus } from '../ml/registry';

export interface DetectionCapability {
  depth: 0 | 1 | 2 | 3;
  headline: string;
  detail: string;
}

const DESCRIPTIONS: Record<number, { headline: string; detail: string }> = {
  0: {
    headline: 'Detection model not installed',
    detail: 'Scanning is unavailable. Fruit and variety information, climate data and the assistant still work.',
  },
  1: {
    headline: 'Fruit only',
    detail: 'Scans identify the fruit. The variety and disease models are not installed.',
  },
  2: {
    headline: 'Fruit and variety',
    detail: 'Scans identify the fruit and its variety. The disease model is not installed.',
  },
  3: {
    headline: 'Fruit, variety and disease',
    detail: 'All detection stages are available.',
  },
};

export function describeDetectionCapability(statuses: ModelStatus[]): DetectionCapability {
  const depth = pipelineDepth(statuses);
  return { depth, ...DESCRIPTIONS[depth] };
}
