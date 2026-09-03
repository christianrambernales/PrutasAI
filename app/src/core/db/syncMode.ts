/**
 * Whether this install uploads at all.
 *
 * Stored beside `device_id` and `consent_seen_at` in the `setting` table so the
 * first-run choice survives a relaunch. Null means the user has not chosen yet,
 * which is what puts the Welcome screen on screen.
 */

import type { SqlDriver } from './driver';
import { getSetting, setSetting } from './repositories/settings';

export type SyncMode = 'offline' | 'account';

const KEY = 'sync_mode';

export function getSyncMode(db: SqlDriver): SyncMode | null {
  const value = getSetting(db, KEY);
  // An unrecognised value is treated as unchosen rather than trusted: it is
  // better to ask again than to silently upload for someone who chose offline.
  return value === 'offline' || value === 'account' ? value : null;
}

export function setSyncMode(db: SqlDriver, mode: SyncMode): void {
  setSetting(db, KEY, mode);
}
