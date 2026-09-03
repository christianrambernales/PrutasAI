/**
 * POST /api/v1/scans — the one write path off the device.
 *
 * Deliberately narrow: there is no read endpoint and the app cannot run SQL,
 * so a fully compromised client still cannot retrieve another device's rows.
 */

import type { RateLimitBinding } from '../limits.js';
import { checkLimits } from '../limits.js';
import type { ApiResult, RequestContext } from '../http.js';
import { validateScan } from '../validate.js';

export interface InsertableScan {
  user_id: string;
  id: string;
  device_id: string;
  image_uri: string | null;
  fruit_key: string | null;
  fruit_conf: number | null;
  variety_key: string | null;
  variety_conf: number | null;
  bbox_json: unknown;
  manifest_version: number | null;
  created_at: string;
  lat: number | null;
  lon: number | null;
}

/** 2 dp is the privacy promise; a client sending more precision does not get it stored. */
function coarse(value: number | undefined): number | null {
  return value === undefined ? null : Math.round(value * 100) / 100;
}

export interface ScanDeps {
  limiter: RateLimitBinding;
  /** Returns the user id the token belongs to, or null if it does not verify. */
  verifyToken(token: string): Promise<string | null>;
  insertScan(row: InsertableScan): Promise<void>;
}

export interface ScanContext extends RequestContext {
  /**
   * The raw bearer token the request carried, or null when it carried none.
   * Unverified at this point: `deps.verifyToken` is what turns it into a user,
   * and it runs behind the rate-limit gate.
   */
  accessToken: string | null;
}

function json(status: number, body: unknown, headers?: Record<string, string>): ApiResult {
  return { status, body, headers };
}

export async function handleScans(
  deps: ScanDeps,
  body: unknown,
  ctx: ScanContext,
): Promise<ApiResult> {
  // Throttle first: a flood of malformed bodies must cost one counter check,
  // not a full validation pass each.
  const gate = await checkLimits(deps.limiter, 'scan', ctx.deviceId, ctx.ip);
  if (!gate.allowed) {
    return json(429, { error: 'rate limited' }, { 'Retry-After': String(gate.retryAfter) });
  }

  // Fail closed: an unattributed row is exactly what this design removed.
  if (ctx.accessToken === null) return json(401, { error: 'authentication required' });

  // Verification is a network round trip to the auth service, so it lives
  // behind the gate above rather than in front of it: a flood of requests
  // carrying junk tokens must cost one counter check, not one round trip each.
  let userId: string | null;
  try {
    userId = await deps.verifyToken(ctx.accessToken);
  } catch (cause) {
    // Same rule as the storage failure below: log the cause, never echo it.
    // An auth outage is an upstream failure, not a bad request.
    console.error('scans: verifyToken failed', cause);
    return json(502, { error: 'upstream unavailable' });
  }
  if (userId === null) return json(401, { error: 'authentication required' });

  // device_id is scan metadata and the rate-limiter key — no longer an
  // ownership mechanism.
  if (ctx.deviceId === null) return json(400, { error: 'X-Device-Id required' });

  const check = validateScan(body);
  if (!check.ok) return json(400, { error: check.error });
  const row = check.value;

  try {
    await deps.insertScan({
      user_id: userId,
      id: row.uuid,
      device_id: ctx.deviceId,
      // image_uri is always null in practice: the drain never sends it (a
      // device file path can carry the user's name), so this maps through
      // whatever validateScan allowed rather than asserting a value.
      image_uri: row.image_uri ?? null,
      fruit_key: row.fruit_key ?? null,
      fruit_conf: row.fruit_conf ?? null,
      variety_key: row.variety_key ?? null,
      variety_conf: row.variety_conf ?? null,
      // The column is jsonb; validateScan already proved this parses.
      bbox_json: row.bbox_json === undefined ? null : JSON.parse(row.bbox_json),
      manifest_version: row.manifest_version ?? null,
      created_at: row.created_at,
      lat: coarse(row.lat),
      lon: coarse(row.lon),
    });
  } catch (cause) {
    // Never echo the cause in the response: it can carry the connection
    // string. Server-side logging is fine — it's what tells apart a
    // validation bug from a database outage from the outside.
    console.error('scans: insertScan failed', cause);
    return json(502, { error: 'upstream unavailable' });
  }

  return json(201, { ok: true });
}
