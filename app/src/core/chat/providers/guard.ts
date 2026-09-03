/**
 * Output guards — step 5 of design spec §12.
 *
 * A reworded answer is only allowed through if it says the same thing the
 * deterministic layer computed. Two checks, both cheap and both refusals by
 * default:
 *
 *   1. `verdict_echo` must equal the computed verdict. A model that changed the
 *      conclusion is discarded outright.
 *   2. Every numeric token in the reworded text must already appear in the
 *      supplied facts. This is what stops an invented dosage, rainfall figure or
 *      confidence from reaching a farmer.
 *
 * Returning `null` means "use the template instead" — never "show this anyway".
 */

export interface Rephrasing {
  text: string;
  verdict_echo: string | null;
}

interface Guarded {
  facts: string[];
  verdict: string | null;
}

/** Digit runs, keeping separators so "2,930" and "1.5" stay single tokens. */
const NUMBER = /\d[\d.,]*/g;

/** Trailing separators are punctuation, not part of the number. */
function trimNumber(token: string): string {
  return token.replace(/[.,]+$/, '');
}

export function guardRephrasing(candidate: Rephrasing, answer: Guarded): string | null {
  const text = typeof candidate?.text === 'string' ? candidate.text.trim() : '';
  if (text === '') return null;

  // 1. The conclusion must survive the rewording unchanged.
  if (answer.verdict !== null && candidate.verdict_echo !== answer.verdict) return null;

  // 2. No number may appear that the facts did not supply.
  const supplied = answer.facts.join(' ');
  const suppliedNumbers = new Set((supplied.match(NUMBER) ?? []).map(trimNumber));
  for (const token of text.match(NUMBER) ?? []) {
    if (!suppliedNumbers.has(trimNumber(token))) return null;
  }

  return text;
}
