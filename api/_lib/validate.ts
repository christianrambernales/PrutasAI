/**
 * Allow-list validation for POST /v1/scans.
 *
 * Unknown fields are rejected rather than dropped: silently ignoring them
 * would let a schema drift lose data without anyone noticing.
 */

export interface ScanRow {
  uuid: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
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

export type AssistantPolicy = 'general' | 'restricted';

export interface AssistantReply {
  on_topic: boolean;
  text: string;
  policy: AssistantPolicy;
  warning: boolean;
}

export type AssistantReplyValidation =
  | { ok: true; value: AssistantReply }
  | { ok: false; error: string };

const ALLOWED = new Set([
  'uuid', 'created_at', 'updated_at', 'deleted_at', 'image_uri', 'fruit_key', 'fruit_conf',
  'variety_key', 'variety_conf', 'bbox_json', 'manifest_version', 'lat', 'lon',
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[a-z0-9_]{1,40}$/;
const MAX_TEXT = 512;
const MAX_ASSISTANT_TEXT = 1000;

const RESTRICTED_QUESTION = /\b(?:disease|diseases|sick|symptom|symptoms|diagnos\w*|anthrac\w*|powdery mildew|rust|scab|blight|mold\w*|mould\w*|amag|rot|rott\w*|bulok|gamot|gamutin|lunas|pest|pesticide|fungicide|insecticide|spray|dose|dosage|chemical|sakit|peste|spots?|wilt|yellow(?:ing)?)\b|\b(?:what is wrong|what is this|ano ito|anong sakit)\b/i;
const OBSERVATION = /\b(?:i see|i saw|i notice|i noticed|there (?:is|are)|these|my .{1,60}\b(?:has|have|looks?|appears?|seems?)|with|covered|growing on|on|sa|may|nakikita|napansin)\b/i;
const VISIBLE_FEATURE = /\b(?:growth|patch(?:es)?|mark(?:s)?|coating|film|fuzz|fuzzy|cottony|powdery|raised|pale|white|black|brown|orange|gray|grey|discolou?r\w*|texture|crust|bump(?:s)?|lump(?:s)?|streak(?:s)?|pattern(?:s)?|ooze|sticky|curl\w*|droop\w*|shrivel\w*|weird|strange|unusual|wrong|bad)\b/i;
const RESTRICTED_REPLY_CONTENT = /\b(?:diagnos\w*|anthrac\w*|mildew|rust|scab|blight|fung\w*|bacter\w*|virus|viral|infection|infect\w*|disease|pest|mite|aphid|larva|caterpillar|canker|lesion|fungicide|pesticide|insecticide|chemical|treat\w*|cure\w*|spray\w*|apply|application|dose|dosage|ml|gram|grams|lit(?:er|re)s?|kill|eradicate|gamot|gamutin|lunas|dosis|wisik|ipahid|ilagay|mix|dilute|concentrat\w*|capful|teaspoon|tablespoon)\b|\b\d+(?:\.\d+)?\s*(?:%|mg|g|ml|l|lit(?:er|re)s?)\b/i;
const REFERRAL = /\b(?:local agriculturist|agriculturist|agricultural extension worker|extension worker|local expert|agriculturista|extension worker)\b/i;
const CLEAR_CROP_CARE = /\b(?:plant\w*|grow\w*|space\w*|water\w*|irrigat\w*|soil|fertili[sz]\w*|nutrient\w*|compost|prun\w*|mulch|weed\w*|shade|sunlight|sun exposure|rainfall|temperature|climate|season|seed(?:ling)?s?|transplant\w*|harvest\w*|ripen\w*)\b/i;

/** Server-owned classification. A client-provided policy flag is never authority. */
export function classifyAssistantPolicy(question: unknown): AssistantPolicy {
  if (typeof question !== 'string' || question.trim() === '') return 'restricted';
  const normalized = question.normalize('NFKC');
  const plantPartMentioned = /\b(?:plant|crop|fruit|leaf|leaves|stem|trunk|root|roots|bark|flower|blossom|seed|seedling|tree|dahon|bunga|ugat|tangkay)\b/i.test(normalized);
  return RESTRICTED_QUESTION.test(normalized)
    || (plantPartMentioned && OBSERVATION.test(normalized) && VISIBLE_FEATURE.test(normalized))
    ? 'restricted'
    : 'general';
}

/** The unrestricted model tier is reserved for recognizable benign crop care. */
export function isClearCropCareQuestion(question: unknown): boolean {
  return typeof question === 'string' && CLEAR_CROP_CARE.test(question.normalize('NFKC'));
}

/** Validate the provider envelope and reject restricted content before it reaches a client. */
export function validateAssistantReply(input: unknown, policy: AssistantPolicy): AssistantReplyValidation {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'reply must be an object' };
  }
  const body = input as Record<string, unknown>;
  if (body.on_topic !== true) {
    return { ok: true, value: { on_topic: false, text: '', policy, warning: false } };
  }
  if (typeof body.text !== 'string') return { ok: false, error: 'text must be a string' };
  const text = body.text.trim();
  if (text.length === 0 || text.length > MAX_ASSISTANT_TEXT) return { ok: false, error: 'text length is invalid' };

  if (policy === 'restricted') {
    if (body.policy !== 'restricted' || body.warning !== true) {
      return { ok: false, error: 'restricted reply metadata is invalid' };
    }
    if (RESTRICTED_REPLY_CONTENT.test(text) || !REFERRAL.test(text)) {
      return { ok: false, error: 'restricted reply is unsafe or has no referral' };
    }
    return { ok: true, value: { on_topic: true, text, policy, warning: true } };
  }

  if (RESTRICTED_REPLY_CONTENT.test(text)) {
    return { ok: false, error: 'general reply contains restricted content' };
  }

  return { ok: true, value: { on_topic: true, text, policy, warning: true } };
}

function fail(error: string): Validation {
  return { ok: false, error };
}

export class OwnershipConflictError extends Error {
  constructor(message = 'ownership conflict') {
    super(message);
    this.name = 'OwnershipConflictError';
  }
}

export function isOwnerConflict(cause: unknown): boolean {
  if (cause instanceof OwnershipConflictError) return true;
  if (cause instanceof Error) {
    const msg = cause.message.toLowerCase();
    if (
      msg.includes('ownership conflict') ||
      msg.includes('not your') ||
      msg.includes('owner mismatch') ||
      msg.includes('parent ownership conflict')
    ) {
      return true;
    }
  }
  return false;
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

  if (body.updated_at !== undefined) {
    if (typeof body.updated_at !== 'string' || Number.isNaN(Date.parse(body.updated_at))) {
      return fail('updated_at must be ISO-8601');
    }
  }

  if (body.deleted_at !== undefined && body.deleted_at !== null) {
    if (typeof body.deleted_at !== 'string' || Number.isNaN(Date.parse(body.deleted_at))) {
      return fail('deleted_at must be ISO-8601 or null');
    }
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
