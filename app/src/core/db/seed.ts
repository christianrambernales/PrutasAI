import type { SqlDriver } from './driver';

export function seedContent(driver: SqlDriver, seedSql: string, contentVersion: string): boolean {
  const row = driver.get<{ value: string }>("SELECT value FROM setting WHERE key = 'content_version'");
  if (row?.value === contentVersion) return false;
  driver.exec(seedSql);
  return true;
}
