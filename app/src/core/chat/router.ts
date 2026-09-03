import { matchIntent } from './intent';

export type Tier = 'grounded' | 'general';

/**
 * One decision per question.
 *
 * The grounded set is exactly the intents the knowledge base and the climate
 * layer can answer deterministically. Everything else — including remedies and
 * disease questions, which the old build refused outright — goes to the general
 * tier, where the answer is clearly labelled as not coming from the knowledge
 * base.
 *
 * Routing is deliberately separate from `answerQuestion`: the grounded path
 * keeps every guarantee it has today, and nothing on the general path can reach
 * back into it.
 */
const GROUNDED = new Set([
  'crop_suitability', 'variety_info', 'fruit_info', 'climate_now', 'model_status',
]);

export function routeQuestion(question: string): { tier: Tier } {
  const { intent } = matchIntent(question);
  return { tier: GROUNDED.has(intent) ? 'grounded' : 'general' };
}
