/**
 * POST /api/v1/conversations — upsert one conversation row.
 *
 * Upsert-by-uuid doubles as the rename/soft-delete/restore sync path: those
 * are all just field changes on the same row (see the design spec §5), so
 * there is exactly one write shape here, not four.
 *
 * That upsert runs as service_role, which bypasses RLS, so the ownership check
 * RLS would otherwise perform has to happen here instead. `conversation.id` is
 * the sole primary key, so without it a caller who learned another user's
 * conversation uuid could upsert straight over that row — retitling it,
 * soft-deleting it, or reassigning user_id to themselves.
 * 0005_conversation_policy_hardening.sql closed the RLS backstop; this closes
 * the service_role path that backstop cannot reach.
 */

import type { RateLimitBinding } from '../limits.js';
import { checkLimits } from '../limits.js';
import type { ApiResult, RequestContext } from '../http.js';

export interface UpsertableConversation {
  user_id: string;
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ConversationDeps {
  limiter: RateLimitBinding;
  verifyToken(token: string): Promise<string | null>;
  /**
   * The user_id already on the stored row, or null when no row holds this id
   * yet. Null is the ordinary case — a first upload — and is not an error.
   */
  ownerOfConversation(id: string): Promise<string | null>;
  upsertConversation(row: UpsertableConversation): Promise<void>;
}

export interface ConversationContext extends RequestContext {
  accessToken: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 'user_id' is accepted but never read below: the row always takes user_id
// from the verified token (see handleConversations), so a client-supplied
// value here is silently ignored rather than rejected as an unknown field.
const ALLOWED = new Set(['uuid', 'title', 'created_at', 'updated_at', 'deleted_at', 'user_id']);
const MAX_TITLE = 200;

function json(status: number, body: unknown, headers?: Record<string, string>): ApiResult {
  return { status, body, headers };
}

function validate(input: unknown): { ok: true; value: { uuid: string; title: string; created_at: string; updated_at: string; deleted_at: string | null } } | { ok: false; error: string } {
  if (input === null || typeof input !== 'object') return { ok: false, error: 'body must be an object' };
  const body = input as Record<string, unknown>;

  for (const key of Object.keys(body)) {
    if (!ALLOWED.has(key)) return { ok: false, error: `unknown field: ${key}` };
  }
  if (typeof body.uuid !== 'string' || !UUID.test(body.uuid)) return { ok: false, error: 'uuid must be a UUID' };
  if (typeof body.title !== 'string' || body.title.length === 0 || body.title.length > MAX_TITLE) {
    return { ok: false, error: 'title must be 1-200 characters' };
  }
  for (const key of ['created_at', 'updated_at'] as const) {
    if (typeof body[key] !== 'string' || Number.isNaN(Date.parse(body[key] as string))) {
      return { ok: false, error: `${key} must be ISO-8601` };
    }
  }
  if (body.deleted_at !== undefined && body.deleted_at !== null) {
    if (typeof body.deleted_at !== 'string' || Number.isNaN(Date.parse(body.deleted_at))) {
      return { ok: false, error: 'deleted_at must be ISO-8601 or null' };
    }
  }

  return {
    ok: true,
    value: {
      uuid: body.uuid, title: body.title as string,
      created_at: body.created_at as string, updated_at: body.updated_at as string,
      deleted_at: (body.deleted_at as string | null | undefined) ?? null,
    },
  };
}

export async function handleConversations(
  deps: ConversationDeps,
  body: unknown,
  ctx: ConversationContext,
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
    console.error('conversations: verifyToken failed', cause);
    return json(502, { error: 'upstream unavailable' });
  }
  if (userId === null) return json(401, { error: 'authentication required' });

  const check = validate(body);
  if (!check.ok) return json(400, { error: check.error });
  const row = check.value;

  // Ownership before the write, because the write itself cannot enforce it:
  // an upsert keyed on the primary key would otherwise let anyone who knows
  // the uuid take the row over. A row nobody owns yet is a first upload.
  let owner: string | null;
  try {
    owner = await deps.ownerOfConversation(row.uuid);
  } catch (cause) {
    console.error('conversations: ownerOfConversation failed', cause);
    return json(502, { error: 'upstream unavailable' });
  }
  if (owner !== null && owner !== userId) return json(403, { error: 'not your conversation' });

  try {
    await deps.upsertConversation({
      user_id: userId,
      id: row.uuid,
      title: row.title,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    });
  } catch (cause) {
    console.error('conversations: upsertConversation failed', cause);
    return json(502, { error: 'upstream unavailable' });
  }

  return json(201, { ok: true });
}
