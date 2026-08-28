/**
 * POST /api/v1/claim — attach this device's anonymous rows to a signed-in user.
 *
 * It needs the service role because no RLS policy grants a user access to rows
 * with `user_id is null`; that is the point of the policy, not a gap in it.
 *
 * Known weakness, stated deliberately: claiming trusts `device_id`, an
 * unverified value the client sends. Someone who obtained another device's ID
 * could claim its anonymous scans. Exposure is low — the rows carry no personal
 * data — but it is a real limitation of anonymous-then-claim.
 */

import type { RateLimitBinding } from '../limits';
import { checkLimits } from '../limits';
import type { ApiResult } from '../http';

export interface ClaimDeps {
  limiter: RateLimitBinding;
  /** Returns the user id the token belongs to, or null if it does not verify. */
  verifyToken(token: string): Promise<string | null>;
  claim(userId: string, deviceId: string): Promise<number>;
}

export interface ClaimContext {
  deviceId: string | null;
  accessToken: string | null;
  ip: string;
}

export async function handleClaim(deps: ClaimDeps, ctx: ClaimContext): Promise<ApiResult> {
  // Throttle first, same as handleScans: an unverified device_id is not a
  // security boundary, but every request past this point costs a service-role
  // round trip (auth.getUser, then a write), and this is the one write path
  // that RLS cannot bound by frequency. Reuses the 'scan' scope deliberately —
  // claiming is a write on the same per-device budget, and 'claim' has no
  // ceiling of its own in rateStore's CEILINGS.
  const gate = await checkLimits(deps.limiter, 'scan', ctx.deviceId, ctx.ip);
  if (!gate.allowed) {
    return { status: 429, body: { error: 'rate limited' }, headers: { 'Retry-After': String(gate.retryAfter) } };
  }

  if (ctx.accessToken === null) return { status: 401, body: { error: 'authentication required' } };
  if (ctx.deviceId === null) return { status: 400, body: { error: 'X-Device-Id required' } };

  const userId = await deps.verifyToken(ctx.accessToken);
  if (userId === null) return { status: 401, body: { error: 'authentication required' } };

  try {
    const claimed = await deps.claim(userId, ctx.deviceId);
    return { status: 200, body: { claimed } };
  } catch (cause) {
    // Never echo the cause in the response, but log it server-side so a
    // validation bug and a database outage don't look identical from outside.
    console.error('claim: claim failed', cause);
    return { status: 502, body: { error: 'upstream unavailable' } };
  }
}
