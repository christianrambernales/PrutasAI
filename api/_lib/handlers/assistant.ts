/**
 * POST /api/v1/assistant — the only route to a model.
 *
 * GEMINI_API_KEY lives here and nowhere else. There is no client-side fix for
 * a shipped secret: obfuscation and encryption both fail because the app must
 * decrypt to use it. The only fix is that the key never ships.
 */

import type { RateLimitBinding } from '../limits';
import { checkLimits, RETRY_AFTER_SECONDS } from '../limits';
import type { ApiResult, RequestContext } from '../http';
import { GENERAL_INSTRUCTION, REPHRASE_INSTRUCTION } from '../instructions';

export type AskResult = { ok: true; data: unknown } | { ok: false; status: number };

export interface AssistantDeps {
  limiter: RateLimitBinding;
  ask(instruction: string, payload: unknown): Promise<AskResult>;
}

interface AssistantBody {
  mode?: string;
  question?: string;
  context?: string;
  verdict?: string | null;
  facts?: string[];
  curated?: string;
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
  const instruction = general ? GENERAL_INSTRUCTION : REPHRASE_INSTRUCTION;
  const payload = general
    ? { question: body.question ?? '', context: body.context ?? '' }
    : { verdict: body.verdict ?? null, facts: body.facts ?? [], curated_wording: body.curated ?? '' };

  const result = await deps.ask(instruction, payload);

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

  return { status: 200, body: result.data };
}
