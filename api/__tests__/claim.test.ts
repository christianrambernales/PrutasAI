import { expect, test, vi } from 'vitest';
import { handleClaim } from '../_lib/handlers/claim';

const CTX = { deviceId: 'dev-1', accessToken: 'tok', ip: '1.2.3.4' };

function deps(userId: string | null, claimed = 3, allow = true) {
  return {
    limiter: { limit: vi.fn(async () => ({ success: allow })) },
    verifyToken: vi.fn(async (_t: string) => userId),
    claim: vi.fn(async (_u: string, _d: string) => claimed),
  };
}

test('a valid token claims the device\'s anonymous rows', async () => {
  const d = deps('user-1');
  const result = await handleClaim(d, CTX);

  expect(result.status).toBe(200);
  expect(result.body).toEqual({ claimed: 3 });
  expect(d.claim).toHaveBeenCalledWith('user-1', 'dev-1');
});

test('a missing token is refused before anything is written', async () => {
  const d = deps('user-1');
  const result = await handleClaim(d, { ...CTX, accessToken: null });

  expect(result.status).toBe(401);
  expect(d.claim).not.toHaveBeenCalled();
});

test('a token that does not verify is refused', async () => {
  const d = deps(null);
  const result = await handleClaim(d, { ...CTX, accessToken: 'forged' });

  expect(result.status).toBe(401);
  expect(d.claim).not.toHaveBeenCalled();
});

test('a missing device id is refused: there is nothing to claim', async () => {
  const d = deps('user-1');
  const result = await handleClaim(d, { ...CTX, deviceId: null });

  expect(result.status).toBe(400);
  expect(d.claim).not.toHaveBeenCalled();
});

test('claiming twice is idempotent: the second call claims nothing', async () => {
  const d = deps('user-1', 0);
  const result = await handleClaim(d, CTX);

  expect(result.status).toBe(200);
  expect(result.body).toEqual({ claimed: 0 });
});

test('a failure does not echo the cause', async () => {
  const d = deps('user-1');
  d.claim.mockRejectedValueOnce(new Error('postgres://user:hunter2@db.internal'));
  const result = await handleClaim(d, CTX);

  expect(result.status).toBe(502);
  expect(JSON.stringify(result.body)).not.toContain('hunter2');
});

test('a request over the limit is refused with Retry-After, before verifyToken is ever called', async () => {
  const d = deps('user-1', 3, false);
  const result = await handleClaim(d, CTX);

  expect(result.status).toBe(429);
  expect(result.headers?.['Retry-After']).toBe('60');
  expect(d.verifyToken).not.toHaveBeenCalled();
  expect(d.claim).not.toHaveBeenCalled();
});
