/**
 * Deliberately left unedited below this note, other than renaming "Worker" to
 * "API" in this same header comment block. The backend moved from a
 * Cloudflare Worker to a Vercel function during the platform-accounts
 * migration; this file's code did not change at all, and that is the
 * evidence the wire contract survived the migration intact. If you are
 * tempted to "fix" the wording further, don't — editing this file is exactly
 * how that evidence would be destroyed.
 *
 * Talks to the PrutasAI API.
 *
 * Carries no credential. The API holds the Gemini key as an encrypted
 * secret, so nothing extractable from the APK grants access to a model — which
 * is the whole reason this provider replaced the in-app Gemini one. The only
 * thing the app sends about itself is a per-install id, which is a rate-limit
 * key and not authentication.
 *
 * Two tiers, two contracts:
 *
 *   `rephrase`  — the grounded tier. Unchanged from before: the model is given
 *                 already-computed facts and a verdict and asked only to reword
 *                 them, and `guardRephrasing` discards anything that changes the
 *                 conclusion or introduces a number the facts did not supply.
 *                 Any failure resolves to the curated wording.
 *
 *   `answerGeneral` — the general tier. No numeric guard applies, because there
 *                 are no supplied facts to check against; the visible caveat in
 *                 the chat bubble carries that weight instead. It may never
 *                 invent an answer, so failures come back as errors and a
 *                 refusal comes back with an empty text.
 */

import type { GroundedAnswer } from '../answer';
import { guardRephrasing, Rephrasing } from './guard';
import type { ChatProvider, GeneralAnswer, GeneralErrorKind, HistoryTurn } from './types';

export interface ProxyOptions {
  /** The Worker's public URL. Empty means the app was built unconfigured. */
  baseUrl: string;
  deviceId: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /**
   * Called when a *rephrasing* fails for a reason the user should know about —
   * an outage, a rejected request, a timeout. Deliberately NOT called when a
   * guard rejects a rewording: that is the safety net working as designed, and
   * the curated answer already on screen is the correct one.
   *
   * Without this, every failure looked identical to success-with-no-change,
   * which is how a 404 on every single request once went unnoticed.
   */
  onDiagnostic?: (message: string) => void;
}

const TIMEOUT_MS = 12000;

/** English defaults. The UI localises from `errorKind`; these are the fallback. */
const ERRORS: Record<GeneralErrorKind, string> = {
  unconfigured: 'The assistant is not configured.',
  unreachable: 'Could not reach the assistant.',
  rateLimited: 'There are too many questions just now. Try again in a minute.',
  unavailable: 'The assistant is unavailable.',
};

function failed(kind: GeneralErrorKind): GeneralAnswer {
  return { onTopic: false, text: '', error: ERRORS[kind], errorKind: kind };
}

interface Call {
  status: number;
  data: Record<string, unknown>;
}

export function createProxyProvider(options: ProxyOptions): ChatProvider {
  const {
    baseUrl,
    deviceId,
    fetchImpl = fetch,
    timeoutMs = TIMEOUT_MS,
    onDiagnostic,
  } = options;

  const endpoint = `${baseUrl.trim()}/v1/assistant`;
  const configured = baseUrl.trim() !== '';

  /** Resolves to null on any transport failure; never rejects. */
  async function call(body: unknown): Promise<Call | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      return { status: response.status, data };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    id: 'proxy',
    remote: true,
    isAvailable: () => configured,

    async rephrase(answer: GroundedAnswer): Promise<string> {
      if (!configured) return answer.text;

      // Only the assembled facts and the computed verdict leave the device —
      // never the raw question, the photo, or a precise location.
      const result = await call({
        mode: 'rephrase',
        verdict: answer.verdict,
        facts: answer.facts,
        curated: answer.text,
      });

      if (result === null) {
        onDiagnostic?.('Could not reach the assistant — using curated wording.');
        return answer.text;
      }
      if (result.status >= 400) {
        onDiagnostic?.(`The assistant returned ${result.status} — using curated wording.`);
        return answer.text;
      }

      // A guard rejection is silent on purpose: the answer the user is already
      // reading is the correct one.
      return guardRephrasing(result.data as unknown as Rephrasing, answer) ?? answer.text;
    },

    async answerGeneral(question: string, context: string, history?: HistoryTurn[]): Promise<GeneralAnswer> {
      if (!configured) return failed('unconfigured');

      const result = await call({
        mode: 'general', question, context,
        ...(history && history.length > 0 ? { history } : {}),
      });
      if (result === null) return failed('unreachable');
      if (result.status === 429) return failed('rateLimited');
      if (result.status >= 400) return failed('unavailable');

      // An off-topic verdict must not smuggle an answer through its text field.
      if (result.data.on_topic !== true) {
        return { onTopic: false, text: '', error: null, errorKind: null };
      }

      const text = typeof result.data.text === 'string' ? result.data.text.trim() : '';
      // On-topic with nothing to say is a malformed reply, not an empty answer.
      if (text === '') return failed('unavailable');

      return { onTopic: true, text, error: null, errorKind: null };
    },
  };
}
