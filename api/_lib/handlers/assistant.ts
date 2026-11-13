/**
 * POST /api/v1/assistant — the only route to a model.
 *
 * GEMINI_API_KEY lives here and nowhere else. There is no client-side fix for
 * a shipped secret: obfuscation and encryption both fail because the app must
 * decrypt to use it. The only fix is that the key never ships.
 */

import type { RateLimitBinding } from '../limits.js';
import { checkLimits, RETRY_AFTER_SECONDS } from '../limits.js';
import type { ApiResult, RequestContext } from '../http.js';
import { GENERAL_INSTRUCTION, REPHRASE_INSTRUCTION, RESTRICTED_INSTRUCTION } from '../instructions.js';
import { classifyAssistantPolicy, isClearCropCareQuestion, validateAssistantReply } from '../validate.js';

export type AskResult = { ok: true; data: unknown } | { ok: false; status: number };
export type Turn = { role: 'user' | 'model'; text: string };

export interface AssistantDeps {
  limiter: RateLimitBinding;
  ask(instruction: string, turns: Turn[]): Promise<AskResult>;
}

interface HistoryTurn {
  role: 'user' | 'assistant';
  text: string;
}

interface AssistantBody {
  mode?: string;
  question?: string;
  context?: string;
  verdict?: string | null;
  facts?: string[];
  curated?: string;
  history?: unknown;
  language?: unknown;
}

/** How many prior turns ride along, matching the app's own history window. */
const HISTORY_WINDOW = 10;
/** Per-turn ceiling. Well above any real chat turn, far below a quota-burning one. */
const MAX_TURN_TEXT = 4000;

function safeAwarenessFallback(question: string, language: unknown): string {
  const filipino = language === 'FIL';
  const visibleFruitRisk = /\b(?:harvest(?:ed)?|picked|naani|ani)\b/i.test(question)
    && /\b(?:mold\w*|mould\w*|amag|rot|rott\w*|bulok)\b/i.test(question);
  if (filipino) {
    const base = 'Maaaring maraming sanhi ang nakikitang sintomas at hindi nito natutukoy ang sakit. Ilarawan ito sa lokal na agriculturista o agricultural extension worker.';
    return visibleFruitRisk
      ? `${base} Huwag kainin o ibenta ang naaning prutas na may nakikitang amag o bulok; humingi ng payo sa lokal na eksperto.`
      : base;
  }
  const base = 'Visible plant symptoms can have several causes and cannot confirm a disease. Describe what you see to a local agriculturist or agricultural extension worker.';
  return visibleFruitRisk
    ? `${base} Do not eat or sell harvested fruit with visible mold or rot; seek local expert advice.`
    : base;
}

/**
 * Turns an untrusted `history` into turns worth forwarding.
 *
 * This route has no bearer check — only a device-id/IP throttle — so the
 * body is whatever a client chose to send. Left unchecked, `history` is an
 * unbounded prompt on someone else's Gemini quota, and a non-array value
 * makes `.map` throw a 500. Anything unrecognised is dropped, not rejected:
 * a malformed turn is not worth failing an otherwise answerable question.
 */
function historyTurns(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((turn): turn is HistoryTurn => {
      if (turn === null || typeof turn !== 'object') return false;
      const { role, text } = turn as Record<string, unknown>;
      if (role !== 'user' && role !== 'assistant') return false;
      return typeof text === 'string' && text.length > 0 && text.length <= MAX_TURN_TEXT;
    })
    .slice(-HISTORY_WINDOW)
    .map((h): Turn => ({ role: h.role === 'assistant' ? 'model' : 'user', text: h.text }));
}

export async function handleAssistant(
  deps: AssistantDeps,
  raw: unknown,
  ctx: RequestContext,
): Promise<ApiResult> {
  const gate = await checkLimits(deps.limiter, 'chat', ctx.deviceId, ctx.ip);
  if (!gate.allowed) {
    return { status: 429, body: { error: 'rate limited' }, headers: { 'Retry-After': String(gate.retryAfter) } };
  }

  const body = (raw ?? {}) as AssistantBody;
  // Anything that is not exactly 'general' is treated as a rephrase, which is
  // the guarded tier. An unrecognised mode must not open the unguarded one.
  const general = body.mode === 'general';
  const question = typeof body.question === 'string' ? body.question : '';
  const policy = general ? classifyAssistantPolicy(question) : null;
  if (general && policy === 'general' && !isClearCropCareQuestion(question)) {
    return { status: 200, body: { on_topic: false, text: '', policy: 'general', warning: false } };
  }
  const instruction = general
    ? policy === 'restricted' ? RESTRICTED_INSTRUCTION : GENERAL_INSTRUCTION
    : REPHRASE_INSTRUCTION;
  const payload = general
    ? { question, context: typeof body.context === 'string' ? body.context : '' }
    : { verdict: body.verdict ?? null, facts: body.facts ?? [], curated_wording: body.curated ?? '' };

  // History is a general-tier concept only: rephrase explains one scan's
  // verdict in isolation and is never part of a saved conversation thread.
  const priorTurns: Turn[] = general ? historyTurns(body.history) : [];
  const turns: Turn[] = [...priorTurns, { role: 'user', text: JSON.stringify(payload) }];

  const result = await deps.ask(instruction, turns);

  if (!result.ok) {
    // Pass 429 through so the app degrades to curated wording, as it already does.
    if (result.status === 429) {
      return {
        status: 429,
        body: { error: 'quota exhausted' },
        headers: { 'Retry-After': String(RETRY_AFTER_SECONDS) },
      };
    }
    return { status: 502, body: { error: 'upstream error' } };
  }

  if (!general || policy === null) return { status: 200, body: result.data };

  const validated = validateAssistantReply(result.data, policy);
  if (policy === 'restricted' || (!validated.ok && validated.error === 'general reply contains restricted content')) {
    return {
      status: 200,
      body: {
        on_topic: true,
        text: safeAwarenessFallback(question, body.language),
        policy: 'restricted',
        warning: true,
      },
    };
  }
  if (validated.ok) return { status: 200, body: validated.value };
  return { status: 502, body: { error: 'invalid assistant response' } };
}
