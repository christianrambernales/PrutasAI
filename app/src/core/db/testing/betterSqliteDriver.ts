import Database from 'better-sqlite3';
import type { SqlDriver } from '../driver';

export function createTestDriver(): SqlDriver {
  const db = new Database(':memory:');
  return {
    exec: (sql) => { db.exec(sql); },
    all: <T>(sql: string, params: unknown[] = []) => db.prepare(sql).all(...params) as T[],
    get: <T>(sql: string, params: unknown[] = []) => db.prepare(sql).get(...params) as T | undefined,
  };
}
