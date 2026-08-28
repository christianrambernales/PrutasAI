import { expect, test, vi } from 'vitest';
import { checkLimits } from '../_lib/limits';

// The parameter is annotated so `limit.mock.calls[n][0]` is typed rather than
// inferred as an empty tuple — the assertions below read the key back out.
function limiter(allow: boolean) {
  return { limit: vi.fn(async (_options: { key: string }) => ({ success: allow })) };
}

test('a request under both limits passes', async () => {
  const binding = limiter(true);
  const result = await checkLimits(binding as never, 'chat', 'device-1', '1.2.3.4');
  expect(result.allowed).toBe(true);
});

test('both the device key and the ip key are checked', async () => {
  const binding = limiter(true);
  await checkLimits(binding as never, 'chat', 'device-1', '1.2.3.4');
  const keys = binding.limit.mock.calls.map(c => (c[0] as { key: string }).key);
  expect(keys).toEqual(['chat:device-1', 'chat:ip:1.2.3.4']);
});

test('exceeding either limit blocks the request', async () => {
  const binding = limiter(false);
  const result = await checkLimits(binding as never, 'scan', 'device-1', '1.2.3.4');
  expect(result.allowed).toBe(false);
  expect(result.retryAfter).toBeGreaterThan(0);
});

test('a missing device id falls back to the ip so it cannot bypass limiting', async () => {
  const binding = limiter(true);
  await checkLimits(binding as never, 'scan', null, '1.2.3.4');
  const keys = binding.limit.mock.calls.map(c => (c[0] as { key: string }).key);
  expect(keys[0]).toBe('scan:anon:1.2.3.4');
});
