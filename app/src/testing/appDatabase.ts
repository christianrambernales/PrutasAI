import * as SQLite from 'expo-sqlite';
import { openAppDatabase } from '../core/db/appDatabase';
import { recordConsent } from '../core/db/consent';
import type { SqlDriver } from '../core/db/driver';
import { saveSetting, SETTING_KEYS } from '../core/db/repositories/settings';
import { insertScan } from '../core/db/repositories/scans';
import { setSyncMode, type SyncMode } from '../core/db/syncMode';

let db: SqlDriver;

/**
 * An empty, migrated, seeded database — the same one `AppNavigator` will open,
 * because the expo-sqlite mock keeps one connection per filename.
 *
 * Call it in `beforeEach` so a scan written by one test cannot appear in the
 * history of the next.
 */
export function resetAppDatabase(): SqlDriver {
  (SQLite as unknown as { __resetDatabases: () => void }).__resetDatabases();
  db = openAppDatabase();
  return db;
}

/**
 * Most suites test the app past first run, not the consent gate itself; this
 * puts them there. Call after `resetAppDatabase()`.
 */
export function seedConsent(): void {
  recordConsent(db, '2026-08-01T00:00:00.000Z');
}

/**
 * Most suites test the app past the language-pick screen, not the picker
 * itself; this puts them there. Call after `resetAppDatabase()`.
 */
export function seedLanguagePicked(): void {
  saveSetting(db, SETTING_KEYS.languagePicked, '1');
}

/**
 * Most suites test the app past the first-run Welcome screen, not the choice
 * itself; this puts them there. Call after `resetAppDatabase()`.
 */
export function seedSyncMode(mode: SyncMode = 'account'): void {
  setSyncMode(db, mode);
}

/**
 * A fresh database holding two stored scans, for tests about history.
 *
 * The confidences are deliberately present: they are what a future model would
 * write, and no screen may ever put one in front of a user as a diagnosis.
 */
export function seedStoredScans(): SqlDriver {
  const db = resetAppDatabase();
  // Every caller wants scans behind an already-consented app, not the
  // Welcome screen or the disclosure gate — `resetAppDatabase()` above clears
  // both along with everything else, so they are re-seeded here rather than
  // left to the caller.
  seedLanguagePicked();
  seedConsent();
  seedSyncMode();
  const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

  insertScan(db, {
    uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    imageUri: 'file:///test/banana.jpg',
    createdAt: minutesAgo(30),
    fruitKey: 'banana', fruitConf: 0.96,
    varietyKey: 'lakatan', varietyConf: 0.88,
    bboxJson: null, manifestVersion: 1,
    lat: null, lon: null,
  });

  insertScan(db, {
    uuid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    imageUri: 'file:///test/mango.jpg',
    createdAt: minutesAgo(90),
    fruitKey: 'mango', fruitConf: 0.91,
    varietyKey: 'carabao', varietyConf: 0.84,
    bboxJson: null, manifestVersion: 1,
    lat: null, lon: null,
  });

  return db;
}
