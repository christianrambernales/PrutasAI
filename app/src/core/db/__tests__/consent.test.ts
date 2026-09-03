import { hasConsented, recordConsent } from '../consent';
import { freshDb } from '../testing/scanFixtures';

test('a fresh install has not consented', () => {
  expect(hasConsented(freshDb())).toBe(false);
});

test('consent survives once recorded', () => {
  const db = freshDb();
  recordConsent(db, '2026-08-12T10:00:00.000Z');
  expect(hasConsented(db)).toBe(true);
});

test('recording twice is harmless', () => {
  const db = freshDb();
  recordConsent(db, '2026-08-12T10:00:00.000Z');
  recordConsent(db, '2026-08-13T10:00:00.000Z');
  expect(hasConsented(db)).toBe(true);
});
