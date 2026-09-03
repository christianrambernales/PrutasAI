import type { SqlDriver } from './driver';
import initial from './migrations/001_initial.sql';
import location from './migrations/002_scan_location.sql';
import conversations from './migrations/003_conversations.sql';

const MIGRATIONS: { version: number; sql: string }[] = [
  { version: 1, sql: initial },
  { version: 2, sql: location },
  { version: 3, sql: conversations },
];

export function migrate(driver: SqlDriver): number {
  driver.exec(
    'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL, applied_at TEXT NOT NULL)'
  );
  const row = driver.get<{ version: number }>('SELECT MAX(version) AS version FROM schema_version');
  const current = row?.version ?? 0;

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    driver.exec(m.sql);
    driver.exec(
      `INSERT INTO schema_version (version, applied_at) VALUES (${m.version}, '${new Date().toISOString()}')`
    );
  }
  return MIGRATIONS[MIGRATIONS.length - 1].version;
}
