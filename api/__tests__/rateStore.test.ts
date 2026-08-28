import { describe, expect, test, vi } from 'vitest';
import { createRateStore } from '../_lib/rateStore';

function client(count: number) {
  return {
    prune: vi.fn(async (_key: string, _before: string) => {}),
    hit: vi.fn(async (_key: string, _at: string) => {}),
    count: vi.fn(async (_key: string, _since: string) => count),
  };
}

const NOW = () => new Date('2026-08-12T10:00:00.000Z');

test('a key inside its ceiling is allowed', async () => {
  const store = createRateStore(client(5), NOW);
  expect(await store.limit({ key: 'chat:device-1' })).toEqual({ success: true });
});

test('each check prunes, then inserts, then counts', async () => {
  const c = client(1);
  const store = createRateStore(c, NOW);
  await store.limit({ key: 'chat:device-1' });

  // The window is 60s, so anything older than 09:59:00 is gone.
  expect(c.prune).toHaveBeenCalledWith('chat:device-1', '2026-08-12T09:59:00.000Z');
  expect(c.hit).toHaveBeenCalledWith('chat:device-1', '2026-08-12T10:00:00.000Z');
  expect(c.count).toHaveBeenCalledWith('chat:device-1', '2026-08-12T09:59:00.000Z');
});

describe('the ceiling for each key shape', () => {
  // The request counts itself, so `count === max` is the last allowed one.
  test.each([
    ['chat:device-1', 10],
    ['chat:ip:1.2.3.4', 40],
    ['scan:device-1', 30],
    ['scan:ip:1.2.3.4', 120],
    // The no-device fallback sits in the device bucket, not the IP bucket.
    ['scan:anon:1.2.3.4', 30],
  ])('%s allows exactly %i in a window', async (key, max) => {
    const at = createRateStore(client(max), NOW);
    expect(await at.limit({ key })).toEqual({ success: true });

    const over = createRateStore(client(max + 1), NOW);
    expect(await over.limit({ key })).toEqual({ success: false });
  });
});

test('an ip key is matched before the bare scope key', async () => {
  // 'scan:ip:...' also starts with 'scan:', so order of matching is load-bearing:
  // getting it wrong would throttle every IP at the per-device ceiling of 30.
  const store = createRateStore(client(100), NOW);
  expect(await store.limit({ key: 'scan:ip:1.2.3.4' })).toEqual({ success: true });
});

test('a failing count fails open so a database hiccup cannot take the API down', async () => {
  const c = client(0);
  c.count.mockRejectedValueOnce(new Error('connection reset'));
  const store = createRateStore(c, NOW);
  expect(await store.limit({ key: 'chat:device-1' })).toEqual({ success: true });
});

test('a failing insert also fails open', async () => {
  const c = client(0);
  c.hit.mockRejectedValueOnce(new Error('connection reset'));
  const store = createRateStore(c, NOW);
  expect(await store.limit({ key: 'chat:device-1' })).toEqual({ success: true });
});
