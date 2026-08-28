/**
 * Allow-list validation for POST /v1/scans.
 *
 * Unknown fields are rejected rather than dropped: silently ignoring them
 * would let a schema drift lose data without anyone noticing.
 */

export interface ScanRow {
  uuid: string;
  created_at: string;
  image_uri?: string;
  fruit_key?: string;
  fruit_conf?: number;
  variety_key?: string;
  variety_conf?: number;
  bbox_json?: string;
  manifest_version?: number;
  lat?: number;
  lon?: number;
}

export type Validation =
  | { ok: true; value: ScanRow }
  | { ok: false; error: string };

const ALLOWED = new Set([
  'uuid', 'created_at', 'image_uri', 'fruit_key', 'fruit_conf',
  'variety_key', 'variety_conf', 'bbox_json', 'manifest_version', 'lat', 'lon',
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[a-z0-9_]{1,40}$/;
const MAX_TEXT = 512;

function fail(error: string): Validation {
  return { ok: false, error };
}

export function validateScan(input: unknown): Validation {
  if (input === null || typeof input !== 'object') return fail('body must be an object');
  const body = input as Record<string, unknown>;

  for (const key of Object.keys(body)) {
    if (!ALLOWED.has(key)) return fail(`unknown field: ${key}`);
  }

  if (typeof body.uuid !== 'string' || !UUID.test(body.uuid)) return fail('uuid must be a UUID');
  if (typeof body.created_at !== 'string' || Number.isNaN(Date.parse(body.created_at))) {
    return fail('created_at must be ISO-8601');
  }

  for (const key of ['fruit_key', 'variety_key'] as const) {
    const value = body[key];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !KEY.test(value)) return fail(`${key} must be a taxonomy key`);
  }

  for (const key of ['fruit_conf', 'variety_conf'] as const) {
    const value = body[key];
    if (value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
      return fail(`${key} must be between 0 and 1`);
    }
  }

  if (body.manifest_version !== undefined && !Number.isInteger(body.manifest_version)) {
    return fail('manifest_version must be an integer');
  }

  for (const [key, limit] of [['lat', 90], ['lon', 180]] as const) {
    const value = body[key];
    if (value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < -limit || value > limit) {
      return fail(`${key} must be between -${limit} and ${limit}`);
    }
  }

  if (body.image_uri !== undefined) {
    const uri = body.image_uri;
    if (typeof uri !== 'string' || uri.length > MAX_TEXT) return fail('image_uri too long');
    // A remote URI would mean the device is asking the server to trust an
    // address it does not control.
    if (/^https?:/i.test(uri)) return fail('image_uri must be local');
  }

  if (body.bbox_json !== undefined) {
    const bbox = body.bbox_json;
    if (typeof bbox !== 'string' || bbox.length > MAX_TEXT) return fail('bbox_json too long');
    try {
      JSON.parse(bbox);
    } catch {
      return fail('bbox_json must be JSON');
    }
  }

  return { ok: true, value: body as unknown as ScanRow };
}
