/**
 * The always-available provider. It returns the curated wording unchanged, needs
 * no network and no key, and is what every other provider falls back to.
 */

import type { GroundedAnswer } from '../answer';
import type { ChatProvider, GeneralAnswer } from './types';

export const templateProvider: ChatProvider = {
  id: 'template',
  remote: false,
  isAvailable: () => true,
  rephrase: async (answer: GroundedAnswer) => answer.text,

  /**
   * There is no model here, so there is nothing to answer an open question
   * with. Callers gate on `remote` and never reach this; it reports the truth
   * rather than a refusal, because refusing would imply the question was the
   * problem when the assistant is simply switched off.
   */
  answerGeneral: async (): Promise<GeneralAnswer> => ({
    onTopic: false,
    text: '',
    error: 'The assistant is switched off.',
    errorKind: 'unconfigured',
  }),
};
