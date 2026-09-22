import type { SqlDriver } from './driver';
import { openDatabase, prepareDatabase } from './expoSqliteDriver';
import { migrate } from './migrate';
import { seedContent } from './seed';
import seedSql from './seed.sql';

/** Must match the `content_version` row at the end of seed.sql. */
export const CONTENT_VERSION = '2026.08.10';

let readyDriver: SqlDriver | null = null;
let preparation: Promise<SqlDriver> | null = null;

/**
 * The app's one database, ready to read.
 *
 * Migration and seeding are both idempotent and seeding never touches user
 * tables, so calling this on every mount costs a version lookup and nothing
 * else.
 */
/**
 * Awaited once at startup, before `openAppDatabase`.
 *
 * `openAppDatabase` is synchronous and stays that way — every repository in the
 * app is. On web that only works against an already-running SQLite worker, so
 * the cold start has to happen somewhere a wait is allowed. This is that place.
 * See `prepareDatabase` for why the synchronous path cannot do it itself.
 */
export async function prepareAppDatabase(): Promise<SqlDriver> {
  if (readyDriver) return readyDriver;
  if (preparation) return preparation;

  preparation = (async () => {
    await prepareDatabase();
    const driver = openDatabase();
    migrate(driver);
    seedContent(driver, seedSql, CONTENT_VERSION);
    readyDriver = driver;
    return driver;
  })();

  try {
    return await preparation;
  } finally {
    preparation = null;
  }
}

export function openAppDatabase(): SqlDriver {
  if (readyDriver) return readyDriver;

  // Direct navigator renders in focused tests do not mount the outer startup
  // gate. Keep that test seam deterministic while production receives the
  // already-prepared driver from App.tsx.
  const driver = openDatabase();
  migrate(driver);
  seedContent(driver, seedSql, CONTENT_VERSION);
  readyDriver = driver;
  return driver;
}

/** Test-only cache reset; the underlying SQLite mock/file lifecycle is separate. */
export function resetPreparedAppDatabase(): void {
  readyDriver = null;
  preparation = null;
}
