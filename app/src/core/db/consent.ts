/**
 * Whether the first-run disclosure has been shown.
 *
 * It lives in the `setting` table beside `device_id` so it survives a restart:
 * re-disclosing on every launch would train the user to dismiss it unread.
 */

import type { SqlDriver } from './driver';

const KEY = 'consent_seen_at';

export function hasConsented(db: SqlDriver): boolean {
  const row = db.get<{ value: string | null }>('SELECT value FROM setting WHERE key = ?', [KEY]);
  return Boolean(row?.value);
}

export function recordConsent(db: SqlDriver, at: string): void {
  // RETURNING because the driver exposes only row-returning calls.
  db.all('INSERT OR REPLACE INTO setting (key, value) VALUES (?, ?) RETURNING key', [KEY, at]);
}
