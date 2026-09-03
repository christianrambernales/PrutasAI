import { restoreScans } from '../restore';
import { countScans, findScan, insertScan, pendingScans } from '../../db/repositories/scans';
import { sampleScan, seededDb } from '../../db/testing/scanFixtures';

const REMOTE = [
  {
    id: 'r1', created_at: '2026-08-01T10:00:00.000Z', fruit_key: 'banana',
    fruit_conf: 0.9, variety_key: null, variety_conf: null,
    bbox_json: null, manifest_version: 1, lat: 14.5, lon: 121.05,
  },
];

function remoteScan(overrides: Record<string, unknown> = {}) {
  return { ...REMOTE[0], ...overrides };
}

test('restored rows land in the local database already synced', async () => {
  // Seeded, not fresh: REMOTE below carries a real fruit_key ('banana'),
  // and scan.fruit_key is a foreign key into the fruit table.
  const db = seededDb();
  const report = await restoreScans({
    db,
    fetchRemoteScans: async () => [remoteScan({ id: 'r1' })],
    now: () => new Date('2026-08-29T00:00:00.000Z'),
  });

  expect(report).toEqual({ restored: 1, restoreFailed: false });
  // Already synced, so the drain does not send them straight back.
  expect(pendingScans(db)).toEqual([]);
  // The `now` injection point is otherwise unpinned by any assertion above.
  const row = db.get<{ synced_at: string | null }>(
    'SELECT synced_at FROM scan WHERE uuid = ?', ['r1'],
  );
  expect(row?.synced_at).toBe('2026-08-29T00:00:00.000Z');
});

test('restoring multiple rows inserts all of them', async () => {
  const db = seededDb();
  const report = await restoreScans({
    db,
    fetchRemoteScans: async () => [remoteScan({ id: 'r1' }), remoteScan({ id: 'r2' })],
  });

  expect(report).toEqual({ restored: 2, restoreFailed: false });
  expect(countScans(db)).toBe(2);
});

test('a scan already held locally keeps its own photo, not the photo-less remote copy', async () => {
  const db = seededDb();
  insertScan(db, sampleScan({ uuid: 'r1', imageUri: 'file:///local.jpg' }));

  const report = await restoreScans({
    db,
    fetchRemoteScans: async () => [remoteScan({ id: 'r1' })],
  });

  expect(report).toEqual({ restored: 1, restoreFailed: false });
  expect(countScans(db)).toBe(1);
  expect(findScan(db, 'r1')?.imageUri).toBe('file:///local.jpg');
});

test('an inbound bbox_json round-trips through JSON.stringify back to the same object', async () => {
  const db = seededDb();
  await restoreScans({
    db,
    // jsonb comes back parsed; the local column is TEXT, so restore.ts
    // stringifies it on the way in.
    fetchRemoteScans: async () => [remoteScan({ id: 'r1', bbox_json: { x: 0.1, y: 0.2 } })],
  });

  // findScan/StoredScan does not project bbox_json (it is not shown in
  // history), so read the column directly — this is exactly the inbound leg
  // that has no other pin.
  const row = db.get<{ bbox_json: string | null }>(
    'SELECT bbox_json FROM scan WHERE uuid = ?', ['r1'],
  );
  expect(JSON.parse(row!.bbox_json!)).toEqual({ x: 0.1, y: 0.2 });
});

test('a failed read is reported, not swallowed as "you had nothing"', async () => {
  const report = await restoreScans({
    db: seededDb(),
    fetchRemoteScans: async () => { throw new Error('network'); },
  });

  expect(report).toEqual({ restored: 0, restoreFailed: true });
});
