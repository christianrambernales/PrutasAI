import { getSyncMode, setSyncMode } from '../syncMode';
import { setSetting } from '../repositories/settings';
import { freshDb } from '../testing/scanFixtures';

test('an unchosen mode reads as null', () => {
  expect(getSyncMode(freshDb())).toBeNull();
});

test('a chosen mode round-trips', () => {
  const db = freshDb();
  setSyncMode(db, 'offline');
  expect(getSyncMode(db)).toBe('offline');
  setSyncMode(db, 'account');
  expect(getSyncMode(db)).toBe('account');
});

test('an unrecognised stored value reads as null rather than crashing', () => {
  const db = freshDb();
  setSetting(db, 'sync_mode', 'nonsense');
  expect(getSyncMode(db)).toBeNull();
});
