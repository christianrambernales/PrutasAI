/**
 * Deterministic intent matcher — step 1 of the chatbot described in design spec
 * §12. No model is involved: a fixed intent set, matched by keyword in English
 * and Filipino, so the same question always routes the same way and the app can
 * answer with the network off.
 *
 * Order matters. `remedy` is checked before `disease_info` because "anthracnose
 * remedy" names a disease but asks for a cure.
 */

export type Intent =
  | 'crop_suitability'
  | 'fruit_info'
  | 'variety_info'
  | 'disease_info'
  | 'remedy'
  | 'climate_now'
  | 'model_status'
  | 'fallback';

export interface Slots {
  fruitKey?: string;
  varietyKey?: string;
  diseaseName?: string;
}

export interface Match {
  intent: Intent;
  slots: Slots;
}

/** Fruit names the knowledge base carries, in both languages. */
const FRUIT_WORDS: Record<string, string[]> = {
  banana: ['banana', 'bananas', 'saging'],
  mango: ['mango', 'mangoes', 'mangos', 'mangga'],
  papaya: ['papaya', 'papayas'],
};

/** Varieties, with the fruit each belongs to. Mirrors knowledge/taxonomy.yaml. */
const VARIETY_WORDS: Record<string, { key: string; fruitKey: string; words: string[] }> = {
  lakatan: { key: 'lakatan', fruitKey: 'banana', words: ['lakatan'] },
  latundan: { key: 'latundan', fruitKey: 'banana', words: ['latundan'] },
  saba: { key: 'saba', fruitKey: 'banana', words: ['saba'] },
  cavendish: { key: 'cavendish', fruitKey: 'banana', words: ['cavendish'] },
  carabao: { key: 'carabao', fruitKey: 'mango', words: ['carabao'] },
  pico: { key: 'pico', fruitKey: 'mango', words: ['pico', 'piko'] },
  katchamita: { key: 'katchamita', fruitKey: 'mango', words: ['katchamita', 'indian'] },
  solo: { key: 'solo', fruitKey: 'papaya', words: ['solo'] },
  cavite_special: { key: 'cavite_special', fruitKey: 'papaya', words: ['cavite special'] },
  red_lady: { key: 'red_lady', fruitKey: 'papaya', words: ['red lady'] },
  sinta: { key: 'sinta', fruitKey: 'papaya', words: ['sinta'] },
};

const DISEASE_WORDS = ['anthracnose', 'powdery mildew', 'rust', 'scab', 'blight'];

/**
 * Checked before the variety check, so "is it good to plant banana (saba)"
 * asks whether saba suits the place rather than what saba is. A named variety
 * with no planting verb still falls through to `variety_info`.
 */
const SUITABILITY_WORDS = [
  'can i grow', 'can i plant', 'grow here', 'suitable', 'suitability', 'thrive',
  'is it good to plant', 'good to plant', 'should i plant', 'worth planting',
  'will it grow', 'best to plant',
  'magtanim', 'pwede ba', 'puwede ba', 'angkop', 'tumubo', 'mabubuhay',
  'ok ba', 'okay ba', 'maganda ba', 'dapat ba', 'itanim',
];
const VARIETY_QUESTION_WORDS = ['variety', 'varieties', 'cultivar', 'uri ng', 'mga uri', 'klase'];
const REMEDY_WORDS = ['remedy', 'remedies', 'treat', 'treatment', 'cure', 'spray', 'fungicide',
  'gamot', 'gamutin', 'lunas', 'paano ayusin'];
const DISEASE_QUESTION_WORDS = ['disease', 'sick', 'infection', 'sakit', 'peste'];
const CLIMATE_WORDS = ['weather', 'climate', 'rainfall', 'rain', 'temperature', 'humid',
  'panahon', 'ulan', 'init', 'lamig'];
const MODEL_WORDS = ['model', 'models', 'detect', 'detection', 'scan', 'scanning', 'identify',
  'weights', 'installed'];

/** Longest a fruit mention can be and still count as "tell me about X". */
const BARE_MENTION_WORDS = 4;

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some(n => haystack.includes(n));
}

/** Whole-word match, so "saba" does not fire inside "sabaw". */
function containsWord(haystack: string, needle: string): boolean {
  if (needle.includes(' ')) return haystack.includes(needle);
  return new RegExp(`\\b${needle}\\b`, 'u').test(haystack);
}

function findFruit(text: string): string | undefined {
  for (const [key, words] of Object.entries(FRUIT_WORDS)) {
    if (words.some(w => containsWord(text, w))) return key;
  }
  return undefined;
}

function findVariety(text: string): { key: string; fruitKey: string } | undefined {
  for (const entry of Object.values(VARIETY_WORDS)) {
    if (entry.words.some(w => containsWord(text, w))) {
      return { key: entry.key, fruitKey: entry.fruitKey };
    }
  }
  return undefined;
}

function findDisease(text: string): string | undefined {
  return DISEASE_WORDS.find(d => text.includes(d));
}

export function matchIntent(raw: string): Match {
  const text = normalise(raw);
  if (text === '') return { intent: 'fallback', slots: {} };

  const variety = findVariety(text);
  const fruitKey = findFruit(text) ?? variety?.fruitKey;
  const diseaseName = findDisease(text);
  const slots: Slots = {};
  if (fruitKey) slots.fruitKey = fruitKey;
  if (variety) slots.varietyKey = variety.key;
  if (diseaseName) slots.diseaseName = diseaseName;

  // A cure is asked for more specifically than a disease is asked about, so
  // remedy wins when both appear.
  if (containsAny(text, REMEDY_WORDS)) return { intent: 'remedy', slots };

  if (containsAny(text, SUITABILITY_WORDS)) return { intent: 'crop_suitability', slots };

  if (containsAny(text, VARIETY_QUESTION_WORDS) || variety) {
    return { intent: 'variety_info', slots };
  }

  if (diseaseName || containsAny(text, DISEASE_QUESTION_WORDS)) {
    return { intent: 'disease_info', slots };
  }

  if (containsAny(text, MODEL_WORDS)) return { intent: 'model_status', slots };

  if (containsAny(text, CLIMATE_WORDS)) return { intent: 'climate_now', slots };

  // A bare mention only. "Mango" and "tell me about papaya" are asking what the
  // knowledge base holds; "how far apart should I space banana suckers" merely
  // names a fruit while asking something the knowledge base cannot answer, and
  // must fall through so the general tier gets it instead of a variety count.
  if (fruitKey && text.split(' ').length <= BARE_MENTION_WORDS) {
    return { intent: 'fruit_info', slots };
  }

  return { intent: 'fallback', slots };
}
