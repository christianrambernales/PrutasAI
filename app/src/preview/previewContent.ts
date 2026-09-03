/**
 * Design-preview content for the screen shells.
 *
 * THIS IS NOT A PREDICTION PATH. Nothing here may ever be fed back into a scan
 * record, a result screen driven by the real pipeline, or any surface that
 * claims a detection happened. The pipeline reports what it actually knows and
 * says so when a model is missing — see core/ml/registry and core/status.
 *
 * It exists only so the presentational screens can be built and reviewed before
 * the SQLite driver and the trained weights land. Delete it once repositories
 * feed the screens.
 */

import { COLORS, SEVERITY_COLOR } from '../ui';
import type {
  ChatMessage,
  ClimateNormals,
  ClimateSnapshot,
  DetectionStage,
  FruitSummary,
  ModelRow,
  MonitoringSession,
  ScanGroup,
  ScanResult,
  ScanSummary,
  Checkpoint,
  Source,
  Suitability,
  VarietySummary,
} from '../features/viewModels';

export const FRUITS: FruitSummary[] = [
  { key: 'banana', emoji: '🍌', nameEn: 'Banana', nameFil: 'Saging', varietyCount: 4 },
  { key: 'mango', emoji: '🥭', nameEn: 'Mango', nameFil: 'Mangga', varietyCount: 3 },
  { key: 'papaya', emoji: '🍈', nameEn: 'Papaya', nameFil: 'Papaya', varietyCount: 4 },
];

export const RECENT_SCANS: ScanSummary[] = [
  { id: 's6', emoji: '🍌', title: 'Banana · Lakatan', status: 'moderate', detail: 'Anthracnose', timeLabel: '10:24' },
  { id: 's5', emoji: '🥭', title: 'Mango · Carabao', status: 'healthy', detail: 'No disease found', timeLabel: 'Yesterday' },
  { id: 's4', emoji: '🍈', title: 'Papaya', status: 'undetermined', detail: 'Variety unknown', timeLabel: 'Aug 8' },
];

export const SCAN_GROUPS: ScanGroup[] = [
  { label: 'TODAY', scans: [
    RECENT_SCANS[0],
    { id: 's5b', emoji: '🍌', title: 'Banana · Saba', status: 'healthy', detail: 'No disease found', timeLabel: '09:02' },
  ] },
  { label: 'THIS WEEK', scans: [
    RECENT_SCANS[1],
    RECENT_SCANS[2],
    { id: 's3', emoji: '🍌', title: 'Banana · Lakatan', status: 'severe', detail: 'Anthracnose', timeLabel: 'Aug 5' },
  ] },
  { label: 'EARLIER', scans: [
    { id: 's1', emoji: '🥭', title: 'Mango', status: 'undetermined', detail: 'Variety model missing', timeLabel: 'Jul 28' },
  ] },
];

export const CLIMATE: ClimateSnapshot = {
  place: 'Los Baños, Laguna',
  coordsLabel: '14.17, 121.24 · rounded to 2 dp',
  freshness: 'cached',
  freshnessLabel: 'Cached · 2 h ago',
  temperatureC: 31,
  condition: 'Partly cloudy',
  feelsLikeLabel: 'Feels like 36° · Aug 10',
  humidityPct: 74,
  rainTodayMm: 2.5,
  elevationM: 21,
};

export const NORMALS: ClimateNormals = {
  monthlyRainMm: [52, 34, 46, 63, 138, 212, 264, 287, 247, 178, 126, 80],
  annualRainMm: 2930,
  meanTemperatureC: 27.4,
  fetchedLabel: 'Computed from 5-year normals fetched 12 Jun 2026 — not from today’s weather.',
};

export const SUITABILITY: Suitability = {
  fruitEmoji: '🍌',
  fruitName: 'Banana',
  verdict: 'potentially_suitable',
  headline: 'Potentially suitable',
  detail: 'Within tolerated ranges, outside optimal on one parameter.',
  basisLabel: NORMALS.fetchedLabel,
  sourceLabel: 'Ranges unverified · Data: Open-Meteo (CC BY 4.0)',
  evidence: [
    { label: 'Mean temperature', value: '27.4 °C', rangeLabel: 'optimal 26–30 °C', status: 'optimal', icon: 'thermometer' },
    { label: 'Annual rainfall', value: '2,930 mm', rangeLabel: 'optimal 1,800–2,600 mm', status: 'tolerated', icon: 'cloudRain' },
    { label: 'Elevation', value: '21 m', rangeLabel: 'optimal below 600 m', status: 'optimal', icon: 'mountain' },
  ],
};

export const RESULT: ScanResult = {
  emoji: '🍌',
  savedLabel: 'Saved to history · scan #6 · manifest v1',
  severityLabel: 'moderate',
  severityPercent: 27,
  stages: [
    { stage: 1, caption: 'STAGE 1 · FRUIT', name: 'Banana', secondary: '· Saging', confidence: 96, color: COLORS.healthy },
    { stage: 2, caption: 'STAGE 2 · VARIETY', name: 'Lakatan', confidence: 88, color: COLORS.healthy },
    { stage: 3, caption: 'STAGE 3 · DISEASE', name: 'Anthracnose', confidence: 91, color: COLORS.severityModerate },
  ],
  remedy: {
    verified: false,
    treatment: 'Remove and destroy affected fruit. Apply a protectant fungicide on the remaining bunch.',
    timing: 'Every 10–14 days through the wet season.',
    prevention: 'Bag developing bunches; keep the plantation floor clear of fallen fruit.',
  },
};

export const MANGO_VARIETIES: VarietySummary[] = [
  { key: 'carabao', nameEn: 'Carabao', nameFil: 'Carabao', mlClassIndex: 0, note: '≈81% of national mango area' },
  { key: 'pico', nameEn: 'Pico', nameFil: 'Piko', mlClassIndex: 1 },
  { key: 'katchamita', nameEn: 'Katchamita', nameFil: 'Indian', mlClassIndex: 2 },
];

export const MANGO_STRAINS: VarietySummary[] = [
  { key: 'mmsu_gold', nameEn: 'MMSU Gold', nameFil: 'MMSU Gold', mlClassIndex: null, parentName: 'Carabao' },
  { key: 'sweet_elena', nameEn: 'Sweet Elena', nameFil: 'Sweet Elena', mlClassIndex: null, parentName: 'Carabao' },
];

/** Variety lists per fruit, transcribed from knowledge/taxonomy.yaml. */
export const VARIETIES_BY_FRUIT: Record<string, VarietySummary[]> = {
  banana: [
    { key: 'lakatan', nameEn: 'Lakatan', nameFil: 'Lakatan', mlClassIndex: 0 },
    { key: 'latundan', nameEn: 'Latundan', nameFil: 'Latundan', mlClassIndex: 1 },
    { key: 'saba', nameEn: 'Saba', nameFil: 'Saba', mlClassIndex: 2 },
    { key: 'cavendish', nameEn: 'Cavendish', nameFil: 'Cavendish', mlClassIndex: 3 },
  ],
  mango: MANGO_VARIETIES,
  papaya: [
    { key: 'solo', nameEn: 'Solo', nameFil: 'Solo', mlClassIndex: 0 },
    { key: 'cavite_special', nameEn: 'Cavite Special', nameFil: 'Cavite Special', mlClassIndex: 1 },
    { key: 'red_lady', nameEn: 'Red Lady', nameFil: 'Red Lady', mlClassIndex: 2 },
    { key: 'sinta', nameEn: 'Sinta', nameFil: 'Sinta', mlClassIndex: 3 },
  ],
};

/** Only mango carries non-ML strains today. */
export const STRAINS_BY_FRUIT: Record<string, VarietySummary[]> = {
  banana: [],
  mango: MANGO_STRAINS,
  papaya: [],
};

export const MANGO_SOURCES: Source[] = [
  {
    citation: 'PCAARRD-DOST',
    detail: 'Mango — Industry Strategic Science and Technology Plans',
    retrievedLabel: 'retrieved 2026-08-10',
  },
  {
    citation: 'Department of Agriculture',
    detail: '9 new varieties that will strengthen the Philippine mango industry',
    retrievedLabel: 'retrieved 2026-08-10',
  },
];

export const SESSION: MonitoringSession = {
  emoji: '🍌',
  title: 'Banana · Lakatan',
  subtitle: 'Anthracnose · started Aug 5',
  progress: 'improving',
  progressDetail: 'Severity fell from 27% to 12% over 5 days.',
  checkpoints: [
    { day: 0, dateLabel: 'Aug 5', status: 'moderate', percent: 27, note: 'Initial scan', done: true },
    { day: 5, dateLabel: 'Aug 10', status: 'early', percent: 12, note: 'Improving since day 0', done: true },
    { day: 10, dateLabel: 'Aug 15', status: null, percent: null, note: 'in 5 days', done: false },
  ],
};

export const CHAT: ChatMessage[] = [
  { id: 'm1', role: 'user', text: 'Pwede bang magtanim ng saging dito sa amin?' },
  { id: 'm2', role: 'assistant', text: 'Batay sa 5-taong normals para sa Los Baños, Laguna: maaaring angkop ang saging.' },
  { id: 'm3', role: 'assistant', text: 'Ang ulan ay mas mataas kaysa sa optimal na saklaw, kaya siguraduhing maayos ang drainage ng lupa.' },
];

/**
 * Every suggestion must be something the intent matcher actually routes.
 * "Switch to English" used to sit here and looked like a command, but it matched
 * nothing and fell through to the catch-all reply.
 */
export const CHAT_SUGGESTIONS = [
  'Paano ang mangga?',
  'Anthracnose remedy',
  'Anong mga uri ng saging?',
];

export const SOURCES_BY_FRUIT: Record<string, Source[]> = {
  banana: [
    {
      citation: 'PCAARRD-DOST',
      detail: 'Improved Lakatan and Cavendish varieties through S&T',
      retrievedLabel: 'retrieved 2026-08-10',
    },
  ],
  mango: MANGO_SOURCES,
  papaya: [
    {
      citation: 'UPLB Institute of Plant Breeding',
      detail: 'Sinta papaya, the super breed',
      retrievedLabel: 'retrieved 2026-08-10',
    },
  ],
};

/** Every sample scan, newest first, flattened out of the grouped history. */
export const ALL_SCANS: ScanSummary[] = SCAN_GROUPS.flatMap(group => group.scans);

const SEVERITY_PERCENT: Record<ScanSummary['status'], number | null> = {
  early: 12,
  moderate: 27,
  severe: 61,
  healthy: null,
  undetermined: null,
};

/**
 * Builds the sample result for a sample scan, so opening two different history
 * rows shows two different results rather than the same banana every time.
 *
 * Sample data only — a *fresh* capture never lands here. It goes to
 * CaptureResultScreen, which reports what the registry can actually do.
 */
export function resultForScan(scanId: string): ScanResult | null {
  const scan = ALL_SCANS.find(s => s.id === scanId);
  if (!scan) return null;

  const [fruit, variety] = scan.title.split('·').map(part => part.trim());
  const diseased = scan.detail !== 'No disease found' && scan.status !== 'undetermined';
  const percent = SEVERITY_PERCENT[scan.status];

  const stages: DetectionStage[] = [
    { stage: 1, caption: 'STAGE 1 · FRUIT', name: fruit, confidence: 96, color: COLORS.healthy },
    variety
      ? { stage: 2, caption: 'STAGE 2 · VARIETY', name: variety, confidence: 88, color: COLORS.healthy }
      : { stage: 2, caption: 'STAGE 2 · VARIETY', name: 'Not identified', secondary: `· ${scan.detail}`, confidence: 0, color: COLORS.textLight },
    diseased
      ? { stage: 3, caption: 'STAGE 3 · DISEASE', name: scan.detail, confidence: 91, color: SEVERITY_COLOR[scan.status] }
      : { stage: 3, caption: 'STAGE 3 · DISEASE', name: scan.detail, confidence: scan.status === 'healthy' ? 94 : 0, color: scan.status === 'healthy' ? COLORS.healthy : COLORS.textLight },
  ];

  return {
    emoji: scan.emoji,
    savedLabel: `Sample scan ${scan.id} · ${scan.timeLabel}`,
    severityLabel: scan.status,
    severityPercent: percent,
    stages,
    remedy: diseased ? RESULT.remedy : null,
  };
}

/**
 * The monitoring session for a given scan.
 *
 * Same reasoning as resultForScan: opening monitoring from a mango scan used to
 * show a banana session, because the screen was handed one frozen constant no
 * matter which scan started it.
 */
export function sessionForScan(scanId: string): MonitoringSession | null {
  const scan = ALL_SCANS.find(s => s.id === scanId);
  if (!scan) return null;

  const percent = SEVERITY_PERCENT[scan.status];
  const diseased = percent !== null;

  // Nothing is being tracked yet for a healthy or unidentified scan, so the
  // session opens with only its first checkpoint recorded.
  const later: Checkpoint[] = diseased
    ? [
        { day: 5, dateLabel: '+5 days', status: 'early', percent: Math.round(percent * 0.45), note: 'Improving since day 0', done: true },
        { day: 10, dateLabel: '+10 days', status: null, percent: null, note: 'due', done: false },
      ]
    : [
        { day: 5, dateLabel: '+5 days', status: null, percent: null, note: 'due', done: false },
        { day: 10, dateLabel: '+10 days', status: null, percent: null, note: 'due', done: false },
      ];

  return {
    emoji: scan.emoji,
    title: scan.title,
    subtitle: `${scan.detail} · started ${scan.timeLabel}`,
    progress: diseased ? 'improving' : 'stable',
    progressDetail: diseased
      ? `Severity fell from ${percent}% to ${Math.round(percent * 0.45)}% over 5 days.`
      : 'Nothing to track yet — no lesion was measured on the first scan.',
    checkpoints: [
      { day: 0, dateLabel: scan.timeLabel, status: scan.status, percent, note: 'Initial scan', done: true },
      ...later,
    ],
  };
}

/**
 * A mixed registry state: stage 1 and the banana head ready, the mango head
 * missing. pipelineDepth() scores this as depth 2 — "Fruit and variety".
 */
export const MODELS: ModelRow[] = [
  { id: 'fruit_detector', stage: 1, state: 'ready', source: 'bundled', version: '1.0.0', verified: true },
  { id: 'variety_banana', stage: 2, state: 'ready', source: 'bundled', version: '1.0.0', verified: false },
  { id: 'variety_mango', stage: 2, state: 'missing', source: null, version: null, verified: false,
    note: 'Mango scans stop at the fruit. Banana varieties are unaffected.' },
  { id: 'variety_papaya', stage: 2, state: 'missing', source: null, version: null, verified: false },
  { id: 'disease_detector', stage: 3, state: 'missing', source: null, version: null, verified: false,
    note: 'No disease is ever guessed while this model is absent.' },
];
