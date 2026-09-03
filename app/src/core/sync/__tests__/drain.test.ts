import { drainScans } from '../drain';
import { insertScan, pendingScans } from '../../db/repositories/scans';
import { freshDb, sampleScan } from '../../db/testing/scanFixtures';

function okFetch() {
  return jest.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => (
    { status: 201, json: async () => ({ ok: true }) } as unknown as Response
  ));
}

test('a pending scan is posted and then marked synced', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1' }));
  const fetchImpl = okFetch();

  const report = await drainScans({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'tok-1', fetchImpl });

  expect(report).toEqual({ attempted: 1, synced: 1, failed: 0, sessionExpired: false });
  expect(pendingScans(db)).toEqual([]);
});

test('the photo is never sent', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1', imageUri: 'file:///private/photo.jpg' }));
  const fetchImpl = okFetch();

  await drainScans({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'tok-1', fetchImpl });

  const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
  expect(body).not.toHaveProperty('image_uri');
  expect(JSON.stringify(body)).not.toContain('photo.jpg');
});

test('a scan with a location sends both lat and lon', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1', lat: 14.5, lon: 121.05 }));
  const fetchImpl = okFetch();

  await drainScans({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'tok-1', fetchImpl });

  const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
  expect(body.lat).toBe(14.5);
  expect(body.lon).toBe(121.05);
});

test('a scan without a location sends neither key, not null', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1' }));
  const fetchImpl = okFetch();

  await drainScans({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'tok-1', fetchImpl });

  const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
  expect(body).not.toHaveProperty('lat');
  expect(body).not.toHaveProperty('lon');
});

test('the device id travels as a header, not in the body', async () => {
  // The body is allow-list validated; an extra field would be a 400.
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1' }));
  const fetchImpl = okFetch();

  await drainScans({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'tok-1', fetchImpl });

  const init = fetchImpl.mock.calls[0][1] as RequestInit;
  expect((init.headers as Record<string, string>)['X-Device-Id']).toBe('dev-1');
  expect(JSON.parse(init.body as string)).not.toHaveProperty('device_id');
});

test('a 5xx leaves the scan pending so nothing is silently lost', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1' }));
  const fetchImpl = jest.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => (
    { status: 500, json: async () => ({}) } as unknown as Response
  ));

  const report = await drainScans({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'tok-1', fetchImpl });

  expect(report).toEqual({ attempted: 1, synced: 0, failed: 1, sessionExpired: false });
  expect(pendingScans(db).map(s => s.uuid)).toEqual(['a1']);
});

test('a 400 marks the scan synced, because retrying a rejected shape forever is a stuck queue', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1' }));
  const fetchImpl = jest.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => (
    { status: 400, json: async () => ({ error: 'unknown field: x' }) } as unknown as Response
  ));

  const report = await drainScans({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'tok-1', fetchImpl });

  expect(report.failed).toBe(0);
  expect(pendingScans(db)).toEqual([]);
});

test('a 429 stops the drain rather than burning through the whole backlog', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1', createdAt: '2026-08-01T00:00:00.000Z' }));
  insertScan(db, sampleScan({ uuid: 'a2', createdAt: '2026-08-02T00:00:00.000Z' }));
  const fetchImpl = jest.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => (
    { status: 429, json: async () => ({}) } as unknown as Response
  ));

  await drainScans({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'tok-1', fetchImpl });

  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(pendingScans(db)).toHaveLength(2);
});

test('an unconfigured build does nothing at all', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1' }));
  const fetchImpl = okFetch();

  const report = await drainScans({ db, baseUrl: '', deviceId: 'dev-1', accessToken: 'tok-1', fetchImpl });

  expect(report).toEqual({ attempted: 0, synced: 0, failed: 0, sessionExpired: false });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('a transport failure leaves the queue intact and never throws', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1' }));
  const fetchImpl = jest.fn(async () => { throw new Error('offline'); });

  const report = await drainScans({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'tok-1', fetchImpl });

  expect(report.failed).toBe(1);
  // A transport failure is not an expired session: the caller must not sign
  // the user out because the phone was in a lift.
  expect(report.sessionExpired).toBe(false);
  expect(pendingScans(db)).toHaveLength(1);
});

test('no token means no upload — offline is not a failure', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a', syncedAt: null }));
  const fetchImpl = jest.fn();

  const report = await drainScans({
    db, baseUrl: 'https://x.test/api', deviceId: 'd1', accessToken: '', fetchImpl,
  });

  expect(report).toEqual({ attempted: 0, synced: 0, failed: 0, sessionExpired: false });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('an upload carries the bearer token, the device id and the location', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a', syncedAt: null, lat: 14.6, lon: 120.98 }));
  const fetchImpl = jest.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => ({ status: 201 }) as Response);

  await drainScans({
    db, baseUrl: 'https://x.test/api', deviceId: 'd1', accessToken: 'tok-1', fetchImpl,
  });

  const init = fetchImpl.mock.calls[0][1] as RequestInit;
  const headers = init.headers as Record<string, string>;
  expect(headers.Authorization).toBe('Bearer tok-1');
  expect(headers['X-Device-Id']).toBe('d1');

  const sent = JSON.parse(init.body as string);
  expect(sent.lat).toBe(14.6);
  expect(sent.lon).toBe(120.98);
});

test('an expired session stops the drain without dropping the queue', async () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a', syncedAt: null }));
  insertScan(db, sampleScan({ uuid: 'b', syncedAt: null }));
  const fetchImpl = jest.fn(async () => ({ status: 401 }) as Response);

  const report = await drainScans({
    db, baseUrl: 'https://x.test/api', deviceId: 'd1', accessToken: 'stale', fetchImpl,
  });

  // sessionExpired is what tells the caller to notify and sign out, rather
  // than retrying a dead token silently on every launch.
  expect(report).toEqual({ attempted: 1, synced: 0, failed: 1, sessionExpired: true });
  // Both rows still queued: the token was stale, the scans were not bad.
  expect(pendingScans(db).map(s => s.uuid).sort()).toEqual(['a', 'b']);
  // Stopped after the first rejection rather than burning the backlog.
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
