import { answerQuestion, ChatContext } from '../answer';

const SUITABILITY = {
  fruitEmoji: '🍌',
  fruitName: 'Banana',
  verdict: 'potentially_suitable' as const,
  headline: 'Potentially suitable',
  detail: 'Within tolerated ranges, outside optimal on one parameter.',
  basisLabel: 'Computed from 5-year normals fetched 12 Jun 2026.',
  sourceLabel: 'Ranges unverified · Data: Open-Meteo (CC BY 4.0)',
  evidence: [
    { label: 'Mean temperature', value: '27.4 °C', rangeLabel: 'optimal 26–30 °C', status: 'optimal' as const, icon: 'thermometer' as const },
    { label: 'Annual rainfall', value: '2,930 mm', rangeLabel: 'optimal 1,800–2,600 mm', status: 'tolerated' as const, icon: 'cloudRain' as const },
  ],
};

const CONTEXT: ChatContext = {
  language: 'EN',
  fruits: [
    { key: 'banana', emoji: '🍌', nameEn: 'Banana', nameFil: 'Saging', varietyCount: 4 },
    { key: 'mango', emoji: '🥭', nameEn: 'Mango', nameFil: 'Mangga', varietyCount: 3 },
  ],
  varietiesByFruit: {
    banana: [
      { key: 'lakatan', nameEn: 'Lakatan', nameFil: 'Lakatan', mlClassIndex: 0 },
      { key: 'saba', nameEn: 'Saba', nameFil: 'Saba', mlClassIndex: 1 },
    ],
    mango: [{ key: 'carabao', nameEn: 'Carabao', nameFil: 'Carabao', mlClassIndex: 0 }],
  },
  strainsByFruit: {
    banana: [],
    mango: [{ key: 'mmsu_gold', nameEn: 'MMSU Gold', nameFil: 'MMSU Gold', mlClassIndex: null, parentName: 'Carabao' }],
  },
  sourcesByFruit: {
    banana: [{ citation: 'PCAARRD-DOST', detail: 'Improved Lakatan', retrievedLabel: 'retrieved 2026-08-10' }],
    mango: [],
  },
  climate: {
    place: 'Los Baños, Laguna',
    coordsLabel: '14.17, 121.24',
    freshness: 'cached',
    freshnessLabel: 'Cached · 2 h ago',
    temperatureC: 31,
    condition: 'Partly cloudy',
    feelsLikeLabel: 'Feels like 36°',
    humidityPct: 74,
    rainTodayMm: 2.5,
    elevationM: 21,
  },
  climateReady: true,
  suitabilityFor: key => (key === 'banana' ? SUITABILITY : null),
  location: { label: 'Los Baños, Laguna', latitude: 14.17, longitude: 121.24 },
  detection: { headline: 'Detection model not installed', detail: 'No models are declared.', depth: 0 },
};

function ask(question: string, overrides: Partial<ChatContext> = {}) {
  return answerQuestion(question, { ...CONTEXT, ...overrides });
}

test('a variety question lists the classes the model can identify', () => {
  const a = ask('What varieties of banana are there?');
  expect(a.text).toContain('Lakatan');
  expect(a.text).toContain('Saba');
});

test('information-only strains are named as not predicted', () => {
  const a = ask('What varieties of mango are there?');
  expect(a.text).toContain('Carabao');
  expect(a.text).toContain('MMSU Gold');
  expect(a.text.toLowerCase()).toContain('information');
});

test('a suitability answer carries the computed verdict for the echo guard', () => {
  const a = ask('Can I grow bananas here?');
  expect(a.verdict).toBe('potentially_suitable');
  expect(a.text).toContain('Potentially suitable');
});

test('the suitability evidence values become checkable facts', () => {
  const a = ask('Can I grow bananas here?');
  expect(a.facts.join(' ')).toContain('27.4');
  expect(a.facts.join(' ')).toContain('2,930');
});

test('suitability without a location says so instead of guessing', () => {
  const a = ask('Can I grow bananas here?', { location: null, climate: null });
  expect(a.verdict).toBe('insufficient_data');
  expect(a.text.toLowerCase()).toContain('location');
});

test('a located user whose climate fetch failed is told that, not that they lack a location', () => {
  const a = ask('Can I grow bananas here?', { climateReady: false, climate: null });
  expect(a.verdict).toBe('insufficient_data');
  // The distinct failure: they *have* a location, the data did not arrive.
  expect(a.text.toLowerCase()).not.toContain('set one in settings');
});

test('suitability for a fruit with no requirement data is insufficient, not a guess', () => {
  const a = ask('Can I grow mangoes here?');
  expect(a.verdict).toBe('insufficient_data');
});

test('a climate question reports the reading with its freshness', () => {
  const a = ask('What is the weather right now?');
  expect(a.text).toContain('31');
  expect(a.text).toContain('Cached · 2 h ago');
});

test('a climate answer never doubles as a verdict', () => {
  expect(ask('What is the weather right now?').verdict).toBeNull();
});

test('a disease question admits the knowledge base is not populated', () => {
  const a = ask('What is anthracnose?');
  expect(a.text.toLowerCase()).toMatch(/not.*(yet|available|populated)/);
});

test('a remedy question never invents a dosage', () => {
  const a = ask('Anthracnose remedy');
  expect(a.text).not.toMatch(/\d+\s*(ml|g|kg|l)\b/i);
  expect(a.text.toLowerCase()).toMatch(/not.*(yet|available|populated)/);
});

test('a model question reports the real registry state', () => {
  const a = ask('Are the models installed?');
  expect(a.text).toContain('Detection model not installed');
});

test('an unrecognised question offers what the assistant can answer', () => {
  const a = ask('what time does the market open');
  expect(a.intent).toBe('fallback');
  expect(a.text.toLowerCase()).toContain('varieties');
});

test('answers cite their source when the knowledge base has one', () => {
  expect(ask('What varieties of banana are there?').sources).toContain('PCAARRD-DOST');
});

test('Filipino questions are answered in Filipino', () => {
  const a = answerQuestion('Anong mga uri ng saging?', { ...CONTEXT, language: 'FIL' });
  expect(a.text).toContain('Lakatan');
  expect(a.text.toLowerCase()).toMatch(/uri|maaaring/);
});

test('every fact stated in a suitability answer appears in the facts list', () => {
  const a = ask('Can I grow bananas here?');
  const numbersInText = a.text.match(/\d[\d,.]*/g) ?? [];
  const factBlob = a.facts.join(' ');
  for (const n of numbersInText) {
    expect(factBlob).toContain(n);
  }
});
