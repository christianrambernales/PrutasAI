/**
 * Historical migration note: during the Cloudflare Worker to Vercel function
 * migration, this provider's request contract remained unchanged. Phase 5
 * later tightened client-side rephrase acceptance while preserving the
 * request body shape; the historical statement applies to that migration
 * point only.
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
 *   `rephrase`  — the grounded tier. The model is given the curated wording,
 *                 already-computed facts and verdict. The client accepts
 *                 formatting-only output; any content change returns a typed
 *                 rejection so the curated answer and visible notice survive.
 *
 *   `answerGeneral` — the general tier. No numeric guard applies, because there
 *                 are no supplied facts to check against; the visible caveat in
 *                 the chat bubble carries that weight instead. It may never
 *                 invent an answer, so failures come back as errors and a
 *                 refusal comes back with an empty text.
 */

import type { GroundedAnswer } from '../answer';
import { guardRephrasing, type RephraseOutcome } from './guard';
import { classifyAssistantPolicy } from '../intent';
import type { ChatProvider, GeneralAnswer, GeneralErrorKind, GeneralPolicy } from './types';

export interface ProxyOptions {
  /** The Worker's public URL. Empty means the app was built unconfigured. */
  baseUrl: string;
  deviceId: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /**
   * Called for transport failures that help diagnose an outage or timeout.
   * Guard decisions are returned as typed outcomes; the hook shows a localized
   * notice on rejection, without logging untrusted model output.
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

function failed(kind: GeneralErrorKind, policy: GeneralPolicy = 'general'): GeneralAnswer {
  return { onTopic: false, text: '', error: ERRORS[kind], errorKind: kind, policy, warning: false };
}

const UNSAFE_AWARENESS = /\b(?:diagnos\w*|anthrac\w*|powdery mildew|rust|scab|blight|fungicide|pesticide|insecticide|chemical|treat\w*|cure\w*|spray\w*|apply|application|dose|dosage|ml|gram|grams|lit(?:er|re)s?|kill|eradicate|gamot|gamutin|lunas|dosis|wisik|ipahid|ilagay)\b|\b\d+(?:\.\d+)?\s*(?:%|mg|g|ml|l|lit(?:er|re)s?)\b/i;
const REFERRAL = /\b(?:local agriculturist|agriculturist|agricultural extension worker|extension worker|local expert|agriculturista)\b/i;

function awarenessFallback(language: 'EN' | 'FIL'): string {
  return language === 'FIL'
    ? 'Maaaring maraming sanhi ang nakikitang sintomas at hindi nito natutukoy ang sakit. Ilarawan ito sa lokal na agriculturista o agricultural extension worker.'
    : 'Visible plant symptoms can have several causes and cannot confirm a disease. Describe what you see to a local agriculturist or agricultural extension worker.';
}

function safeAwarenessText(text: string, language: 'EN' | 'FIL'): string {
  const candidate = text.trim();
  if (candidate.length > 1000 || UNSAFE_AWARENESS.test(candidate) || !REFERRAL.test(candidate)) {
    return awarenessFallback(language);
  }
  return candidate;
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

    async rephrase(answer: GroundedAnswer): Promise<RephraseOutcome> {
      if (!configured) return { status: 'rejected', reason: 'unavailable' };

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
      return { status: 'rejected', reason: 'unavailable' };
      }
      if (result.status >= 400) {
        onDiagnostic?.(`The assistant returned ${result.status} — using curated wording.`);
        return { status: 'rejected', reason: 'unavailable' };
      }

      return guardRephrasing(result.data, answer);
    },

    async answerGeneral(question, context, options = {
      policy: classifyAssistantPolicy(question),
      language: 'EN',
    }): Promise<GeneralAnswer> {
      const language = options.language;
      const policy: GeneralPolicy = options.policy === 'restricted'
        || classifyAssistantPolicy(question) === 'restricted'
        ? 'restricted'
        : 'general';
      if (!configured) return failed('unconfigured', policy);

      const result = await call({
        mode: 'general', question, context, policy, language,
        ...(options.history && options.history.length > 0 ? { history: options.history } : {}),
      });
      if (result === null) return failed('unreachable', policy);
      if (result.status === 429) return failed('rateLimited', policy);
      if (result.status >= 400) return failed('unavailable', policy);

      // An off-topic verdict must not smuggle an answer through its text field.
      if (result.data.on_topic !== true) {
        return { onTopic: false, text: '', error: null, errorKind: null, policy, warning: false };
      }

      const text = typeof result.data.text === 'string' ? result.data.text.trim() : '';
      // The server owns the authoritative question classifier. It can discover
      // an uncertain symptom that the offline client classifier missed.
      const effectivePolicy: GeneralPolicy = result.data.policy === 'restricted' ? 'restricted' : policy;
      // On-topic with nothing to say is a malformed reply, not an empty answer.
      if (text === '') {
        return effectivePolicy === 'restricted'
          ? { onTopic: true, text: awarenessFallback(language), error: null, errorKind: null, policy: effectivePolicy, warning: true }
          : failed('unavailable', effectivePolicy);
      }

      if (effectivePolicy === 'restricted') {
        const metadataValid = result.data.policy === 'restricted' && result.data.warning === true;
        return {
          onTopic: true,
          text: metadataValid ? safeAwarenessText(text, language) : awarenessFallback(language),
          error: null,
          errorKind: null,
          policy: effectivePolicy,
          warning: true,
        };
      }

      if (result.data.policy !== 'general' || result.data.warning !== true) return failed('unavailable', policy);

      return { onTopic: true, text, error: null, errorKind: null, policy, warning: true };
    },
  };
}
