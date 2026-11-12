import { classifyAssistantPolicy, matchIntent, type GeneralPolicy } from './intent';

export type Tier = 'grounded' | 'general';
export type TopicPolicy = 'grounded' | GeneralPolicy;

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

export function routeQuestion(question: string): { tier: Tier; policy: TopicPolicy } {
  const { intent } = matchIntent(question);
  // Crop-health uncertainty takes precedence over a coincidental grounded
  // keyword, so a question about a sick named variety cannot bypass the guard.
  const topicPolicy = classifyAssistantPolicy(question);
  if (topicPolicy === 'restricted') return { tier: 'general', policy: 'restricted' };
  return GROUNDED.has(intent)
    ? { tier: 'grounded', policy: 'grounded' }
    : { tier: 'general', policy: 'general' };
}
