import { expect, test, vi } from 'vitest';
import { handleScans, type InsertableScan } from '../_lib/handlers/scans';
import { clientIp, deviceIdOf } from '../_lib/http';

const CTX = { deviceId: 'device-1', ip: '1.2.3.4' };

function deps(allow = true) {
  return {
    limiter: { limit: vi.fn(async () => ({ success: allow })) },
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

test('a valid scan is stored and answered 201', async () => {
  const d = deps();
  const result = await handleScans(d, body(), CTX);

  expect(result.status).toBe(201);
  expect(d.insertScan).toHaveBeenCalledWith({
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
  const result = await handleScans(d, body(), { deviceId: null, ip: '1.2.3.4' });

  expect(result.status).toBe(400);
  expect(result.body).toEqual({ error: 'X-Device-Id required' });
});

test('the limiter runs before the device-id check, so a missing header cannot skip the counter', async () => {
  // Over the limit AND missing the header. If the device-id check ran first,
  // this would return 400 without ever touching the counter — which is how an
  // attacker omitting one header would sidestep rate limiting entirely.
  const d = deps(false);
  const result = await handleScans(d, body(), { deviceId: null, ip: '1.2.3.4' });

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
