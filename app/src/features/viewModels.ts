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

export interface RemedySummary {
  key: string;
  nameEn: string;
  nameFil: string;
  instructionEn: string | null;
  instructionFil: string | null;
  isPrevention: boolean;
  source?: Source | null;
}

export interface DiseaseSummary {
  key: string;
  nameEn: string;
  nameFil: string;
  descriptionEn: string | null;
  descriptionFil: string | null;
  remedies: RemedySummary[];
  source?: Source | null;
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

export type MonitoringCheckpointStatus = 'due' | 'incomplete' | 'completed' | 'completed_late';
export type MonitoringMissingField = 'photo_missing' | 'note_missing' | 'observation_needed';

export interface MonitoringCheckpointView {
  id: string;
  dayNumber: number;
  scheduledDate: number;
  completedDate: number | null;
  status: MonitoringCheckpointStatus;
  missingFields: MonitoringMissingField[];
  observation: 'better' | 'same' | 'worse' | 'unsure' | null;
  note: string | null;
  photoUri: string | null;
}

export interface MonitoringView {
  id: string;
  emoji: string;
  title: string;
  overallTrend: 'unavailable';
  checkpoints: MonitoringCheckpointView[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /**
   * How the answer was produced, so the screen can label it honestly.
   *
   * `grounded` traces to a knowledge-base row. `general` is model-generated and
   * carries a visible caveat. `refusal` is the app's own wording for an
   * off-topic question — never the model's. `notice` reports a failure and
   * never stands in for an answer.
   */
  kind?: 'grounded' | 'general' | 'refusal' | 'notice';
  /**
   * Attached when the answer computed a suitability verdict, so the evidence
   * card renders under the message it belongs to rather than at a fixed index.
   */
  verdict?: Suitability | null;
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
