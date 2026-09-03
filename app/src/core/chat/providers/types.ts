import type { GroundedAnswer } from '../answer';

/**
 * Why the general tier could not answer. The provider carries a code rather
 * than only prose so the UI can say it in the user's language — the English
 * `error` is the fallback, not the source of truth.
 */
export type GeneralErrorKind = 'unconfigured' | 'unreachable' | 'rateLimited' | 'unavailable';

/**
 * An open-question answer. `text` is non-empty only when `onTopic` is true and
 * `error` is null: a refusal must never carry an answer in its text, and a
 * failure must never carry an invented one.
 */
export interface GeneralAnswer {
  onTopic: boolean;
  text: string;
  error: string | null;
  errorKind: GeneralErrorKind | null;
}

/** One prior turn of a general-tier conversation, oldest first. */
export interface HistoryTurn {
  role: 'user' | 'assistant';
  text: string;
}

/**
 * Adding a provider means implementing this and registering it in the provider
 * list. `rephrase` may never fail: it resolves to the template wording rather
 * than rejecting, so a provider outage is invisible to the user.
 *
 * `answerGeneral` is the opposite contract — it may not invent an answer, so a
 * failure comes back as an error the caller shows.
 */
export interface ChatProvider {
  id: string;
  /**
   * True when rephrasing means a network call. The local provider returns the
   * curated text unchanged, so callers skip the round trip and stay synchronous.
   * It also gates the general tier: answering an open question needs a model,
   * and only a remote provider has one.
   */
  remote: boolean;
  isAvailable(): boolean;
  rephrase(answer: GroundedAnswer): Promise<string>;
  answerGeneral(question: string, context: string, history?: HistoryTurn[]): Promise<GeneralAnswer>;
}
