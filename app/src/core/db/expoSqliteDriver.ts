import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import type { SqlDriver } from './driver';

const DEFAULT_NAME = 'prutasai.db';

/**
 * Boots the SQLite worker before anything calls into it synchronously.
 *
 * On web, expo-sqlite runs SQLite in a Web Worker and its *synchronous* calls
 * block the main thread on a busy loop with a fixed budget: `invokeWorkerSync`
 * spins at most 1,000,000 `Atomics.pause()` iterations — measured at ~38 ms in
 * Chromium — and then throws "Sync operation timeout". A cold worker cannot
 * start, importScripts its bundle, fetch ~1 MB of wa-sqlite.wasm, compile it
 * and open the database inside 38 ms. So the *first* synchronous call failed
 * every single time, and because that call happens in `AppNavigator`'s first
 * render, it took the whole tree down as a blank white page.
 *
 * The asynchronous API has no such budget — it resolves a promise instead of
 * spinning — and expo-sqlite keeps one shared worker for the module. Opening
 * once through it pays the cold start where waiting is allowed, so every later
 * synchronous call finds a live worker and a compiled module, and returns well
 * inside the budget.
 *
 * The handle is closed again rather than kept: the synchronous driver opens its
 * own, and leaving this one open risks the two contending for the same file.
 *
 * Android and iOS have no worker and no busy loop, so this is a no-op there.
 */
export async function prepareDatabase(name = DEFAULT_NAME): Promise<void> {
  if (Platform.OS !== 'web') return;
  const warmUp = await SQLite.openDatabaseAsync(name);
  await warmUp.closeAsync();
}

/**
 * The device driver. Satisfies the same `SqlDriver` contract as the
 * better-sqlite3 driver used in tests, so migrations and repositories are
 * identical on device and in CI.
 *
 * Synchronous on purpose: the repositories are synchronous, and expo-sqlite's
 * sync calls run against a local file, which is fast enough for the row counts
 * this app deals in and keeps a screen from rendering half a list.
 */
export function openDatabase(name = DEFAULT_NAME): SqlDriver {
  const db = SQLite.openDatabaseSync(name);

  return {
    exec(sql: string): void {
      db.execSync(sql);
    },
    all<T>(sql: string, params: unknown[] = []): T[] {
      return db.getAllSync<T>(sql, params as SQLite.SQLiteBindValue[]);
    },
    get<T>(sql: string, params: unknown[] = []): T | undefined {
      return db.getFirstSync<T>(sql, params as SQLite.SQLiteBindValue[]) ?? undefined;
    },
  };
}
