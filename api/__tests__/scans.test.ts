import { expect, test, vi } from 'vitest';
import { handleScans, type InsertableScan } from '../_lib/handlers/scans.js';
import { bearerToken, clientIp, deviceIdOf } from '../_lib/http.js';

const CTX = { deviceId: 'device-1', ip: '1.2.3.4', accessToken: 'good-token' };

function deps(allow = true) {
  return {
    limiter: { limit: vi.fn(async () => ({ success: allow })) },
    // The token is verified through a dependency, not in the endpoint file, so
    // both the five header branches and the *ordering* against the rate limiter
    // are unit-testable here.
    verifyToken: vi.fn(async (_token: string): Promise<string | null> => 'user-abc'),
    // The parameter is annotated so `insertScan.mock.calls[n][0]` is typed rather than
    // inferred as an empty tuple — the assertions below read the key back out.
    insertScan: vi.fn(async (_row: InsertableScan) => {}),
  };
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    uuid: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    created_at: '2026-08-12T09:00:00.000Z',
    fruit_key: 'banana',
    fruit_conf: 0.91,
    ...overrides,
  };
}

test('a request with no bearer token at all is rejected 401', async () => {
  const d = deps();
  const result = await handleScans(d, body(), { ...CTX, accessToken: null });

  expect(result.status).toBe(401);
  expect(result.body).toEqual({ error: 'authentication required' });
  // Nothing to verify, so the auth service is not called either.
  expect(d.verifyToken).not.toHaveBeenCalled();
  expect(d.insertScan).not.toHaveBeenCalled();
});

test('a token that does not verify is rejected 401', async () => {
  const d = deps();
  d.verifyToken.mockResolvedValueOnce(null);
  const result = await handleScans(d, body(), { ...CTX, accessToken: 'expired' });

  expect(d.verifyToken).toHaveBeenCalledWith('expired');
  expect(result.status).toBe(401);
  expect(result.body).toEqual({ error: 'authentication required' });
  expect(d.insertScan).not.toHaveBeenCalled();
});

test('a verified token is what supplies user_id', async () => {
  const d = deps();
  d.verifyToken.mockResolvedValueOnce('user-from-token');
  const result = await handleScans(d, body(), CTX);

  expect(result.status).toBe(201);
  expect(d.insertScan.mock.calls[0]![0].user_id).toBe('user-from-token');
});

test('the rate limiter runs before the token is verified', async () => {
  // The whole point of the ordering: a flood of requests carrying junk tokens
  // must cost one counter check, not a round trip to the auth service each.
  const d = deps(false);
  const result = await handleScans(d, body(), { ...CTX, accessToken: 'junk' });

  expect(result.status).toBe(429);
  expect(result.headers?.['Retry-After']).toBe('60');
  expect(d.limiter.limit).toHaveBeenCalled();
  expect(d.verifyToken).not.toHaveBeenCalled();
});

test('an auth-service outage is a 502 that does not echo the cause', async () => {
  const d = deps();
  d.verifyToken.mockRejectedValueOnce(new Error('https://user:hunter2@auth.internal unreachable'));
  const result = await handleScans(d, body(), CTX);

  expect(result.status).toBe(502);
  expect(result.body).toEqual({ error: 'upstream unavailable' });
  expect(JSON.stringify(result.body)).not.toContain('hunter2');
  expect(JSON.stringify(result.body)).not.toContain('auth.internal');
  expect(d.insertScan).not.toHaveBeenCalled();
});

test('bearerToken reads only a well-formed Bearer header', () => {
  // The three header shapes that must all mean "unauthenticated", kept
  // together so a change to one is visibly a change to all three.
  expect(bearerToken({})).toBeNull();
  expect(bearerToken({ authorization: 'Basic abc' })).toBeNull();
  expect(bearerToken({ authorization: 'Bearer   ' })).toBeNull();
  expect(bearerToken({ authorization: 'Bearer tok-1' })).toBe('tok-1');
});

test('user_id comes from the token, never from the body', async () => {
  const d = deps();
  const result = await handleScans(d, body({ user_id: 'attacker' }), CTX);

  // user_id is not on the allow-list, so supplying it is a 400 — the row is
  // never written with a client-chosen owner.
  expect(result.status).toBe(400);
  expect(result.body).toEqual({ error: 'unknown field: user_id' });
  expect(d.insertScan).not.toHaveBeenCalled();
});

test('a stored scan carries the verified user, the device and the coarse location', async () => {
  const d = deps();
  const result = await handleScans(d, body({ lat: 14.599512, lon: 120.984222 }), CTX);

  expect(result.status).toBe(201);
  const row = d.insertScan.mock.calls[0][0];
  expect(row.user_id).toBe('user-abc');
  expect(row.device_id).toBe('device-1');
  // 2 dp is the privacy promise; more precision is not stored.
  expect(row.lat).toBe(14.6);
  expect(row.lon).toBe(120.98);
});

test('a valid scan is stored and answered 201', async () => {
  const d = deps();
  const result = await handleScans(d, body(), CTX);

  expect(result.status).toBe(201);
  expect(d.insertScan).toHaveBeenCalledWith({
    user_id: 'user-abc',
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    device_id: 'device-1',
    image_uri: null,
    fruit_key: 'banana',
    fruit_conf: 0.91,
    variety_key: null,
    variety_conf: null,
    bbox_json: null,
    manifest_version: null,
    created_at: '2026-08-12T09:00:00.000Z',
    lat: null,
    lon: null,
  });
});

test('a scan with lat/lon stores the rounded pair', async () => {
  const d = deps();
  await handleScans(d, body({ lat: 14.5, lon: 121.05 }), CTX);

  expect(d.insertScan.mock.calls[0]![0].lat).toBe(14.5);
  expect(d.insertScan.mock.calls[0]![0].lon).toBe(121.05);
});

test('a scan without lat/lon stores nulls', async () => {
  const d = deps();
  await handleScans(d, body(), CTX);

  expect(d.insertScan.mock.calls[0]![0].lat).toBeNull();
  expect(d.insertScan.mock.calls[0]![0].lon).toBeNull();
});

test('excess client precision is stored rounded to 2 dp, because the server rounds too', async () => {
  const d = deps();
  await handleScans(d, body({ lat: 14.458961, lon: 121.234567 }), CTX);

  expect(d.insertScan.mock.calls[0]![0].lat).toBe(14.46);
  expect(d.insertScan.mock.calls[0]![0].lon).toBe(121.23);
});

test('an unknown field is rejected rather than dropped', async () => {
  const d = deps();
  const result = await handleScans(d, body({ disease_key: 'anthracnose' }), CTX);

  expect(result.status).toBe(400);
  expect(result.body).toEqual({ error: 'unknown field: disease_key' });
  expect(d.insertScan).not.toHaveBeenCalled();
});

test('a request over the limit is refused with Retry-After', async () => {
  const d = deps(false);
  const result = await handleScans(d, body(), CTX);

  expect(result.status).toBe(429);
  expect(result.headers?.['Retry-After']).toBe('60');
  expect(d.insertScan).not.toHaveBeenCalled();
});

test('the limiter runs before validation so a flood of junk still costs one check', async () => {
  const d = deps(false);
  await handleScans(d, { nonsense: true }, CTX);
  expect(d.limiter.limit).toHaveBeenCalled();
});

test('a missing device id is refused: every row must be attributable', async () => {
  const d = deps();
  const result = await handleScans(d, body(), { ...CTX, deviceId: null });

  expect(result.status).toBe(400);
  expect(result.body).toEqual({ error: 'X-Device-Id required' });
});

test('the limiter runs before the device-id check, so a missing header cannot skip the counter', async () => {
  // Over the limit AND missing the header. If the device-id check ran first,
  // this would return 400 without ever touching the counter — which is how an
  // attacker omitting one header would sidestep rate limiting entirely.
  const d = deps(false);
  const result = await handleScans(d, body(), { ...CTX, deviceId: null });

  expect(d.limiter.limit).toHaveBeenCalled();
  expect(result.status).toBe(429);
});

test('a storage failure is reported without echoing the cause', async () => {
  const d = deps();
  d.insertScan.mockRejectedValueOnce(new Error('postgres://user:hunter2@db.internal timed out'));
  const result = await handleScans(d, body(), CTX);

  expect(result.status).toBe(502);
  expect(JSON.stringify(result.body)).not.toContain('hunter2');
  expect(JSON.stringify(result.body)).not.toContain('db.internal');
});

test('bbox_json arrives as parsed JSON, not a string, because the column is jsonb', async () => {
  const d = deps();
  await handleScans(d, body({ bbox_json: '{"x":0.1,"y":0.2}' }), CTX);
  expect(d.insertScan.mock.calls[0]![0].bbox_json).toEqual({ x: 0.1, y: 0.2 });
});

test('clientIp prioritizes x-real-ip over x-forwarded-for', () => {
  expect(clientIp({ 'x-real-ip': '5.5.5.5', 'x-forwarded-for': '9.9.9.9, 10.0.0.1' })).toBe('5.5.5.5');
});

test('clientIp takes the first entry of x-forwarded-for when x-real-ip is absent', () => {
  expect(clientIp({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' })).toBe('9.9.9.9');
});

test('clientIp falls back rather than throwing when the header is absent', () => {
  expect(clientIp({})).toBe('0.0.0.0');
});

test('deviceIdOf reads X-Device-Id and returns null when absent', () => {
  expect(deviceIdOf({ 'x-device-id': 'abc' })).toBe('abc');
  expect(deviceIdOf({})).toBeNull();
});
