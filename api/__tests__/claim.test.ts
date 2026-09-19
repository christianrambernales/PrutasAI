import { expect, test, vi } from 'vitest';
import { handleClaim } from '../_lib/handlers/claim.js';

const CTX = { deviceId: 'dev-1', accessToken: 'tok', ip: '1.2.3.4' };

function deps(userId: string | null, allow = true) {
  return {
    limiter: { limit: vi.fn(async () => ({ success: allow })) },
    verifyToken: vi.fn(async (_t: string) => userId),
    claim: vi.fn(async (_u: string, _d: string) => 0),
  };
}

test('a valid token request fails closed with 410 and never calls claim', async () => {
  const d = deps('user-1');
  const result = await handleClaim(d, CTX);

  expect(result.status).toBe(410);
  expect(result.body).toEqual({ error: 'claim endpoint deprecated' });
  expect(d.claim).not.toHaveBeenCalled();
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

test('calling claim multiple times fails closed with 410 without writing', async () => {
  const d = deps('user-1');
  const r1 = await handleClaim(d, CTX);
  const r2 = await handleClaim(d, CTX);

  expect(r1.status).toBe(410);
  expect(r2.status).toBe(410);
  expect(d.claim).not.toHaveBeenCalled();
});

test('an auth-service outage is a 502 that does not echo the cause', async () => {
  const d = deps('user-1');
  d.verifyToken.mockRejectedValueOnce(new Error('postgres://user:hunter2@db.internal'));
  const result = await handleClaim(d, CTX);

  expect(result.status).toBe(502);
  expect(JSON.stringify(result.body)).not.toContain('hunter2');
});

test('a request over the limit is refused with Retry-After, before verifyToken is ever called', async () => {
  const d = deps('user-1', false);
  const result = await handleClaim(d, CTX);

  expect(result.status).toBe(429);
  expect(result.headers?.['Retry-After']).toBe('60');
  expect(d.verifyToken).not.toHaveBeenCalled();
  expect(d.claim).not.toHaveBeenCalled();
});