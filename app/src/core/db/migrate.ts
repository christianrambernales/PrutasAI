import type { SqlDriver } from './driver';
import initial from './migrations/001_initial.sql';
import location from './migrations/002_scan_location.sql';
import conversations from './migrations/003_conversations.sql';
import disease_remedy from './migrations/004_knowledge_disease_remedy.sql';
import scan_retention from './migrations/005_scan_retention.sql';
import account_and_sync_security from './migrations/006_account_and_sync_security.sql';

export const MIGRATIONS: { version: number; sql: string }[] = [
  { version: 1, sql: initial },
  { version: 2, sql: location },
  { version: 3, sql: conversations },
  { version: 4, sql: disease_remedy },
  { version: 5, sql: scan_retention },
  { version: 6, sql: account_and_sync_security },
];

export function migrate(driver: SqlDriver, migrations = MIGRATIONS): number {
  driver.exec(
    'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL, applied_at TEXT NOT NULL)'
  );
  const row = driver.get<{ version: number }>('SELECT MAX(version) AS version FROM schema_version');
  const current = row?.version ?? 0;

  for (const m of migrations) {
    if (m.version <= current) continue;
    driver.transaction(() => {
      driver.exec(m.sql);
      driver.exec(
        `INSERT INTO schema_version (version, applied_at) VALUES (${m.version}, '${new Date().toISOString()}')`
      );
    });
  }
  return migrations[migrations.length - 1]?.version ?? current;
}
