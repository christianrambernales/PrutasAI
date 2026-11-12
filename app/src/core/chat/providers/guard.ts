/** Safe, non-sensitive reasons used to decide what fallback notice to persist. */
export type RephraseRejectionReason =
  | 'malformed_response'
  | 'verdict_changed'
  | 'protected_content_changed'
  | 'unavailable';

export type RephraseOutcome =
  | { status: 'accepted'; text: string }
  | { status: 'rejected'; reason: RephraseRejectionReason };

export interface Guarded {
  text: string;
  facts: string[];
  verdict: string | null;
}

/**
 * This API deliberately accepts no semantic paraphrase. Word and punctuation
 * changes cannot be verified without semantic inference, so the only accepted
 * candidate is the curated wording with whitespace formatting normalized.
 * Curated text remains the value returned to the UI in every accepted case.
 */
function normalizeFormatting(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejected(reason: RephraseRejectionReason): RephraseOutcome {
  return { status: 'rejected', reason };
}

export function guardRephrasing(candidate: unknown, answer: Guarded): RephraseOutcome {
  if (!isObject(candidate)) return rejected('malformed_response');
  const keys = Object.keys(candidate);
  if (keys.length !== 2 || !keys.includes('text') || !keys.includes('verdict_echo')) {
    return rejected('malformed_response');
  }
  if (typeof candidate.text !== 'string' || candidate.text.trim() === '' || candidate.text.length > 4000) {
    return rejected('malformed_response');
  }
  if (candidate.verdict_echo !== answer.verdict) return rejected('verdict_changed');

  if (normalizeFormatting(candidate.text) !== normalizeFormatting(answer.text)) {
    return rejected('protected_content_changed');
  }

  return { status: 'accepted', text: answer.text };
}
