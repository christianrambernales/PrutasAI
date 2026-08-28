/**
 * Postgres-backed rate limiting.
 *
 * Three statements per check: prune the window, insert this hit, count what is
 * left. The request counts itself, so `count === max` is the last one allowed.
 *
 * Fail-open is deliberate and narrow. If the counting itself fails, the request
 * proceeds: a database hiccup must not take the API down, and the upstream
 * services have their own quotas. Validation and the secret check remain
 * fail-closed — this exception applies only to the throttle.
 */

import type { RateLimitBinding } from './limits';

export interface RateClient {
  prune(key: string, before: string): Promise<void>;
  hit(key: string, at: string): Promise<void>;
  count(key: string, since: string): Promise<number>;
}

const WINDOW_MS = 60_000;

/**
 * Longest prefix first: `scan:ip:` also starts with `scan:`, and matching the
 * shorter one would throttle a whole IP at the per-device ceiling.
 */
const CEILINGS: { prefix: string; max: number }[] = [
  { prefix: 'scan:ip:', max: 120 },
  { prefix: 'chat:ip:', max: 40 },
  { prefix: 'scan:', max: 30 },
  { prefix: 'chat:', max: 10 },
];

function ceilingFor(key: string): number {
  const match = CEILINGS.find(c => key.startsWith(c.prefix));
  // An unrecognised key is a programming error, not a request to wave through.
  return match ? match.max : 0;
}

export function createRateStore(
  client: RateClient,
  now: () => Date = () => new Date(),
): RateLimitBinding {
  return {
    async limit({ key }: { key: string }): Promise<{ success: boolean }> {
      const at = now();
      const since = new Date(at.getTime() - WINDOW_MS).toISOString();

      try {
        await client.prune(key, since);
        await client.hit(key, at.toISOString());
        const used = await client.count(key, since);
        return { success: used <= ceilingFor(key) };
      } catch {
        return { success: true };
      }
    },
  };
}
