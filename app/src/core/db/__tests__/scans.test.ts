import {
  countScans, findScan, insertScan, listScanGroups, markSynced, newScanUuid, pendingScans,
  resetSyncQueue,
} from '../repositories/scans';
import { freshDb, sampleScan, seededDb } from '../testing/scanFixtures';

test('a scan with no inference is still recorded honestly', () => {
  const driver = freshDb();
  insertScan(driver, sampleScan());

  expect(countScans(driver)).toBe(1);
  const all = listScanGroups(driver).flatMap(g => g.scans);
  expect(all[0].title).toBe('Unidentified');
  expect(all[0].detail).toContain('Not identified');
  expect(all[0].status).toBe('undetermined');
});

test('inserting the same uuid twice does not duplicate the row', () => {
  const driver = freshDb();
  insertScan(driver, sampleScan());
  insertScan(driver, sampleScan());
  expect(countScans(driver)).toBe(1);
});

test('scans come back newest first', () => {
  const driver = freshDb();
  for (const [uuid, createdAt] of [
    ['old', '2026-08-01T10:00:00.000Z'],
    ['new', '2026-08-11T10:00:00.000Z'],
  ]) {
    insertScan(driver, sampleScan({ uuid, createdAt }));
  }
  const all = listScanGroups(driver).flatMap(g => g.scans);
  expect(all[0].id).toBe('new');
});

test('an empty database yields no groups rather than throwing', () => {
  expect(listScanGroups(freshDb())).toEqual([]);
});

test('scans are grouped by how recently they were taken', () => {
  const driver = freshDb();
  const now = new Date('2026-08-11T12:00:00.000Z');
  insertScan(driver, sampleScan({ uuid: 'today', createdAt: '2026-08-11T10:00:00.000Z' }));
  insertScan(driver, sampleScan({ uuid: 'week', createdAt: '2026-08-08T10:00:00.000Z' }));
  insertScan(driver, sampleScan({ uuid: 'older', createdAt: '2026-06-01T10:00:00.000Z' }));

  expect(listScanGroups(driver, now).map(g => g.label)).toEqual(['TODAY', 'THIS WEEK', 'EARLIER']);
});

test('a recorded fruit and variety are named from the content tables', () => {
  const driver = seededDb();
  insertScan(driver, sampleScan({ fruitKey: 'banana', varietyKey: 'lakatan' }));

  const [scan] = listScanGroups(driver).flatMap(g => g.scans);
  expect(scan.title).toBe('Banana · Lakatan');
  expect(scan.emoji).toBe('🍌');
});

test('a stored scan never carries a disease claim, because no model produced one', () => {
  const driver = seededDb();
  insertScan(driver, sampleScan({ fruitKey: 'banana', varietyKey: 'lakatan' }));

  const [scan] = listScanGroups(driver).flatMap(g => g.scans);
  expect(scan.status).toBe('undetermined');
  expect(scan.detail).toBe('No disease model');
});

test('a scan can be found again by its uuid, with the photo it was taken from', () => {
  const driver = seededDb();
  insertScan(driver, sampleScan({ fruitKey: 'mango', varietyKey: 'carabao' }));

  const found = findScan(driver, 'a1');
  expect(found?.imageUri).toBe('file:///photo.jpg');
  expect(found?.title).toBe('Mango · Carabao');
});

test('an unknown uuid is null rather than a fabricated row', () => {
  expect(findScan(seededDb(), 'nope')).toBeNull();
});

test('generated ids are UUIDs, so the sync endpoint will accept them', () => {
  const uuid = newScanUuid();
  expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(newScanUuid()).not.toBe(uuid);
});

test('a newly inserted scan is pending', () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1' }));
  expect(pendingScans(db).map(s => s.uuid)).toEqual(['a1']);
});

test('a synced scan is no longer pending', () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1' }));
  markSynced(db, 'a1', '2026-08-12T10:00:00.000Z');
  expect(pendingScans(db)).toEqual([]);
});

test('a scan inserted as already-synced is never pending', () => {
  // Restored history must not be pushed straight back to the server.
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a1', syncedAt: '2026-08-12T10:00:00.000Z' }));
  expect(pendingScans(db)).toEqual([]);
});

test('pending scans come oldest first so history uploads in the order it happened', () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'new', createdAt: '2026-08-12T10:00:00.000Z' }));
  insertScan(db, sampleScan({ uuid: 'old', createdAt: '2026-08-01T10:00:00.000Z' }));
  expect(pendingScans(db).map(s => s.uuid)).toEqual(['old', 'new']);
});

test('a restored scan with no local photo is readable and reports the absence', () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'r1', imageUri: '', syncedAt: '2026-08-12T10:00:00.000Z' }));
  expect(findScan(db, 'r1')?.imageUri).toBe('');
});

test('resetSyncQueue re-queues every scan, including already-synced ones', () => {
  const db = freshDb();
  insertScan(db, sampleScan({ uuid: 'a', syncedAt: '2026-08-29T00:00:00.000Z' }));
  insertScan(db, sampleScan({ uuid: 'b', syncedAt: null }));

  expect(pendingScans(db).map(s => s.uuid)).toEqual(['b']);

  resetSyncQueue(db);

  expect(pendingScans(db).map(s => s.uuid).sort()).toEqual(['a', 'b']);
});
