/**
 * POST /api/v1/claim — fail-closed legacy claim route.
 *
 * Obsolete and deprecated: the current database schema forbids unowned cloud rows
 * (migration 0003 made scan.user_id NOT NULL and purged unowned rows).
 * Local unowned claiming remains a client/SQLite decision (D-07, D-15).
 *
 * This handler preserves method, authentication, validation, and rate-limit contracts,
 * but fails closed with 410 Gone so that device-id-based privileged ownership
 * transitions are impossible.
 */

import type { RateLimitBinding } from '../limits.js';
import { checkLimits } from '../limits.js';
import type { ApiResult } from '../http.js';

export interface ClaimDeps {
  limiter: RateLimitBinding;
  /** Returns the user id the token belongs to, or null if it does not verify. */
  verifyToken(token: string): Promise<string | null>;
  claim?(userId: string, deviceId: string): Promise<number>;
}

export interface ClaimContext {
  deviceId: string | null;
  accessToken: string | null;
  ip: string;
}

export async function handleClaim(deps: ClaimDeps, ctx: ClaimContext): Promise<ApiResult> {
  // Throttle first: rate limiting protects against resource exhaustion.
  const gate = await checkLimits(deps.limiter, 'scan', ctx.deviceId, ctx.ip);
  if (!gate.allowed) {
    return { status: 429, body: { error: 'rate limited' }, headers: { 'Retry-After': String(gate.retryAfter) } };
  }

  if (ctx.accessToken === null) return { status: 401, body: { error: 'authentication required' } };
  if (ctx.deviceId === null) return { status: 400, body: { error: 'X-Device-Id required' } };

  let userId: string | null;
  try {
    userId = await deps.verifyToken(ctx.accessToken);
  } catch {
    console.error('claim: verifyToken failed');
    return { status: 502, body: { error: 'upstream unavailable' } };
  }
  if (userId === null) return { status: 401, body: { error: 'authentication required' } };

  // Fail closed with 410 Gone: remote rows can no longer be unowned, so
  // remote anonymous-claim is permanently retired (D-07, D-15).
  return { status: 410, body: { error: 'claim endpoint deprecated' } };
}
