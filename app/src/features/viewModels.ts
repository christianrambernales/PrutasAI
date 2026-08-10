import type { SeverityKey } from '../ui';
import type { EvidenceStatus } from '../ui';

/**
 * The shapes screens render. Repositories in core/ produce these; screens never
 * reach for a database themselves.
 */

export interface FruitSummary {
  key: string;
  emoji: string;
  nameEn: string;
  nameFil: string;
  varietyCount: number;
}

export interface VarietySummary {
  key: string;
  nameEn: string;
  nameFil: string;
  /** Index within this fruit's own stage-2 head; null when not a model class. */
  mlClassIndex: number | null;
  note?: string;
  parentName?: string;
}

export interface ScanSummary {
  id: string;
  emoji: string;
  title: string;
  status: SeverityKey;
  detail: string;
  timeLabel: string;
}

export type Freshness = 'live' | 'cached' | 'stale' | 'unavailable';

export interface ClimateSnapshot {
  place: string;
  coordsLabel: string;
  freshness: Freshness;
  freshnessLabel: string;
  temperatureC: number;
  condition: string;
  feelsLikeLabel: string;
  humidityPct: number;
  rainTodayMm: number;
  elevationM: number;
}

export interface ClimateNormals {
  monthlyRainMm: number[];
  annualRainMm: number;
  meanTemperatureC: number;
  fetchedLabel: string;
}

export interface Evidence {
  label: string;
  value: string;
  rangeLabel: string;
  status: EvidenceStatus;
  icon: 'thermometer' | 'cloudRain' | 'mountain';
}

export type Verdict = 'suitable' | 'potentially_suitable' | 'unsuitable' | 'insufficient_data';

export interface Suitability {
  fruitEmoji: string;
  fruitName: string;
  verdict: Verdict;
  headline: string;
  detail: string;
  evidence: Evidence[];
  basisLabel: string;
  sourceLabel: string;
}

export interface DetectionStage {
  stage: 1 | 2 | 3;
  caption: string;
  name: string;
  secondary?: string;
  confidence: number;
  color: string;
}

export interface Remedy {
  treatment: string;
  timing: string;
  prevention: string;
  verified: boolean;
}

export interface ScanResult {
  emoji: string;
  stages: DetectionStage[];
  severityLabel: SeverityKey;
  severityPercent: number | null;
  remedy: Remedy | null;
  savedLabel: string;
}

export interface Checkpoint {
  day: 0 | 5 | 10;
  dateLabel: string;
  status: SeverityKey | null;
  percent: number | null;
  note: string;
  done: boolean;
}

export interface MonitoringSession {
  emoji: string;
  title: string;
  subtitle: string;
  progress: 'improving' | 'worsening' | 'stable';
  progressDetail: string;
  checkpoints: Checkpoint[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface Source {
  citation: string;
  detail: string;
  retrievedLabel: string;
}

export type ModelState = 'ready' | 'missing' | 'checksum_mismatch';

export interface ModelRow {
  id: string;
  /** Pipeline stage, as declared in models/manifest.json. */
  stage: number;
  state: ModelState;
  source: 'bundled' | 'device' | null;
  version: string | null;
  verified: boolean;
  note?: string;
}

export interface ScanGroup {
  label: string;
  scans: ScanSummary[];
}
