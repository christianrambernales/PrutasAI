import type { SqlDriver } from './driver';
import { openDatabase, prepareDatabase } from './expoSqliteDriver';
import { migrate } from './migrate';
import { seedContent } from './seed';
import seedSql from './seed.sql';

/** Must match the `content_version` row at the end of seed.sql. */
export const CONTENT_VERSION = '2026.08.10';

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
export async function prepareAppDatabase(): Promise<void> {
  await prepareDatabase();
}

export function openAppDatabase(): SqlDriver {
  const driver = openDatabase();
  migrate(driver);
  seedContent(driver, seedSql, CONTENT_VERSION);
  return driver;
}
