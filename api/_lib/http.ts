/**
 * The line between HTTP and logic.
 *
 * Handlers return an ApiResult and never touch a Response, so every status
 * code the API can produce is asserted by a unit test rather than by running
 * a server.
 */

import type { VercelResponse } from '@vercel/node';

export interface ApiResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface RequestContext {
  deviceId: string | null;
  ip: string;
}

type Headers = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function clientIp(headers: Headers): string {
  const realIp = first(headers['x-real-ip']);
  if (realIp) return realIp.trim();
  const forwarded = first(headers['x-forwarded-for']);
  if (forwarded) return forwarded.split(',')[0].trim();
  return '0.0.0.0';
}

export function deviceIdOf(headers: Headers): string | null {
  return first(headers['x-device-id']);
}

/**
 * The token from an `Authorization: Bearer <token>` header, or null.
 *
 * Null for every shape that is not a usable token — no header, a different
 * scheme, or `Bearer ` with nothing after it — so a handler has one thing to
 * check rather than three.
 */
export function bearerToken(headers: Headers): string | null {
  const value = first(headers['authorization']);
  if (value === null || !value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length).trim();
  return token === '' ? null : token;
}

export function send(res: VercelResponse, result: ApiResult): void {
  for (const [key, value] of Object.entries(result.headers ?? {})) {
    res.setHeader(key, value);
  }
  res.status(result.status).json(result.body);
}
