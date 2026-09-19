import { cappedFullJitterMs, nextRetryAt, retryAfterMs } from '../backoff';

const NOW = Date.parse('2026-09-19T00:00:00.000Z');

test('parses Retry-After seconds and HTTP dates without accepting invalid values', () => {
  expect(retryAfterMs('12', NOW)).toBe(12_000);
  expect(retryAfterMs('Fri, 19 Sep 2026 00:00:05 GMT', NOW)).toBe(5_000);
  expect(retryAfterMs('not-a-delay', NOW)).toBeNull();
});

test('uses injectable capped full jitter and honors the larger server delay', () => {
  expect(cappedFullJitterMs(99, () => 1, 1_000, 60_000)).toBe(60_000);
  expect(nextRetryAt(0, NOW, '30', () => 0)).toBe('2026-09-19T00:00:30.000Z');
});
