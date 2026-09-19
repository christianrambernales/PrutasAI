/** Pure retry timing helpers. Callers persist the returned timestamp in SQLite. */
export function retryAfterMs(value: string | null | undefined, nowMs: number): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : Math.max(0, at - nowMs);
}

export function cappedFullJitterMs(
  attempt: number,
  random: () => number = Math.random,
  baseMs = 1_000,
  capMs = 60_000,
): number {
  const ceiling = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt));
  return Math.floor(Math.max(0, Math.min(1, random())) * ceiling);
}

export function nextRetryAt(
  attempt: number,
  nowMs: number,
  retryAfter: string | null | undefined,
  random: () => number = Math.random,
): string {
  const serverDelay = retryAfterMs(retryAfter, nowMs) ?? 0;
  const delay = Math.max(serverDelay, cappedFullJitterMs(attempt, random));
  return new Date(nowMs + delay).toISOString();
}
