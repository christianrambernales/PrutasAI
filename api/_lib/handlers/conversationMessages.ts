/**
 * POST /api/v1/conversation-messages — write one message row.
 *
 * Upsert rather than insert-only. A message's text is rewritten in exactly one
 * place — `updateMessageText`, when the assistant's curated wording comes back
 * reworded by the model — and that rewrite clears `synced_at` so the row is
 * re-queued. Dropping the replay on the floor left every other device showing
 * wording the author's device had already replaced, permanently, because the
 * drain still marked the row synced.
 *
 * The write runs as service_role, which bypasses RLS, so both ownership checks
 * RLS would otherwise perform happen here: the parent conversation must belong
 * to the caller, and an existing row under the same id must be the caller's
 * own. Without the second check, allowing an overwrite would let a caller
 * collide deliberately with another user's message id and reassign the row.
 */

import type { RateLimitBinding } from '../limits.js';
import { checkLimits } from '../limits.js';
import type { ApiResult, RequestContext } from '../http.js';

export interface InsertableMessage {
  user_id: string;
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  kind: string | null;
  text: string;
  /**
   * The verdict as a parsed value, not as the JSON string the client sends.
   *
   * The remote column is `jsonb`: handing it the string would store a JSON
   * scalar string rather than an object, and a restoring device would then
   * parse its way back to a string and render nothing. Parsing here is the
   * one place that seam can be closed without a schema change.
   */
  verdict_json: unknown;
  created_at: string;
}

export interface ConversationMessageDeps {
  limiter: RateLimitBinding;
  verifyToken(token: string): Promise<string | null>;
  /**
   * The parent conversation's user_id, or null when no such conversation is
   * stored. Null is left to the insert, whose foreign key rejects it with a
   * 502 the drain retries — a 4xx here would be recorded as permanently
   * accepted and the message would be lost.
   */
  ownerOfConversation(id: string): Promise<string | null>;
  /** The user_id on the stored message with this id, or null for a new one. */
  ownerOfMessage(id: string): Promise<string | null>;
  insertMessage(row: InsertableMessage): Promise<void>;
}

export interface ConversationMessageContext extends RequestContext {
  accessToken: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED = new Set(['uuid', 'conversation_id', 'role', 'kind', 'text', 'verdict_json', 'created_at']);
const MAX_TEXT = 20000;

function json(status: number, body: unknown, headers?: Record<string, string>): ApiResult {
  return { status, body, headers };
}

interface Validated {
  uuid: string; conversation_id: string; role: 'user' | 'assistant';
  kind: string | null; text: string; verdict_json: string | null; created_at: string;
}

function validate(input: unknown): { ok: true; value: Validated } | { ok: false; error: string } {
  if (input === null || typeof input !== 'object') return { ok: false, error: 'body must be an object' };
  const body = input as Record<string, unknown>;

  for (const key of Object.keys(body)) {
    if (!ALLOWED.has(key)) return { ok: false, error: `unknown field: ${key}` };
  }
  if (typeof body.uuid !== 'string' || !UUID.test(body.uuid)) return { ok: false, error: 'uuid must be a UUID' };
  if (typeof body.conversation_id !== 'string' || !UUID.test(body.conversation_id)) {
    return { ok: false, error: 'conversation_id must be a UUID' };
  }
  if (body.role !== 'user' && body.role !== 'assistant') return { ok: false, error: 'role must be user or assistant' };
  if (typeof body.text !== 'string' || body.text.length === 0 || body.text.length > MAX_TEXT) {
    return { ok: false, error: 'text must be 1-20000 characters' };
  }
  if (typeof body.created_at !== 'string' || Number.isNaN(Date.parse(body.created_at))) {
    return { ok: false, error: 'created_at must be ISO-8601' };
  }
  if (body.kind !== undefined && body.kind !== null && typeof body.kind !== 'string') {
    return { ok: false, error: 'kind must be a string or null' };
  }
  if (body.verdict_json !== undefined && body.verdict_json !== null) {
    if (typeof body.verdict_json !== 'string') return { ok: false, error: 'verdict_json must be a JSON string or null' };
    try {
      JSON.parse(body.verdict_json);
    } catch {
      return { ok: false, error: 'verdict_json must be valid JSON' };
    }
  }

  return {
    ok: true,
    value: {
      uuid: body.uuid, conversation_id: body.conversation_id, role: body.role,
      kind: (body.kind as string | null | undefined) ?? null,
      text: body.text, verdict_json: (body.verdict_json as string | null | undefined) ?? null,
      created_at: body.created_at,
    },
  };
}

export async function handleConversationMessages(
  deps: ConversationMessageDeps,
  body: unknown,
  ctx: ConversationMessageContext,
): Promise<ApiResult> {
  const gate = await checkLimits(deps.limiter, 'conv', ctx.deviceId, ctx.ip);
  if (!gate.allowed) {
    return json(429, { error: 'rate limited' }, { 'Retry-After': String(gate.retryAfter) });
  }

  if (ctx.accessToken === null) return json(401, { error: 'authentication required' });

  let userId: string | null;
  try {
    userId = await deps.verifyToken(ctx.accessToken);
  } catch (cause) {
    console.error('conversationMessages: verifyToken failed', cause);
    return json(502, { error: 'upstream unavailable' });
  }
  if (userId === null) return json(401, { error: 'authentication required' });

  const check = validate(body);
  if (!check.ok) return json(400, { error: check.error });
  const row = check.value;

  let conversationOwner: string | null;
  let messageOwner: string | null;
  try {
    conversationOwner = await deps.ownerOfConversation(row.conversation_id);
    messageOwner = await deps.ownerOfMessage(row.uuid);
  } catch (cause) {
    console.error('conversationMessages: ownership lookup failed', cause);
    return json(502, { error: 'upstream unavailable' });
  }
  if (conversationOwner !== null && conversationOwner !== userId) {
    return json(403, { error: 'not your conversation' });
  }
  if (messageOwner !== null && messageOwner !== userId) {
    return json(403, { error: 'not your message' });
  }

  try {
    await deps.insertMessage({
      user_id: userId,
      id: row.uuid,
      conversation_id: row.conversation_id,
      role: row.role,
      kind: row.kind,
      text: row.text,
      verdict_json: row.verdict_json === null ? null : JSON.parse(row.verdict_json),
      created_at: row.created_at,
    });
  } catch (cause) {
    console.error('conversationMessages: insertMessage failed', cause);
    return json(502, { error: 'upstream unavailable' });
  }

  return json(201, { ok: true });
}
