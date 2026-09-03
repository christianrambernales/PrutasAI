/**
 * A stable per-install id for the assistant proxy.
 *
 * This is NOT authentication and NOT a user identity. It is a rate-limit key,
 * so one install cannot monopolise the shared model quota. It is forgeable by
 * design — the Vercel function treats it as a hint and bounds abuse by IP —
 * and it carries nothing about the device or the person using it.
 *
 * It lives in the `setting` table so it survives a restart; a new id every
 * launch would make per-device limiting meaningless.
 */

import type { SqlDriver } from '../db/driver';

const KEY = 'device_id';
const HEX = '0123456789abcdef';

function random(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += HEX[Math.floor(Math.random() * 16)];
  return out;
}

export function deviceId(db: SqlDriver): string {
  const stored = db.get<{ value: string | null }>(
    'SELECT value FROM setting WHERE key = ?',
    [KEY],
  );
  if (stored?.value) return stored.value;

  const created = `${Date.now().toString(16)}-${random(12)}`;
  // RETURNING because the driver exposes only row-returning calls, and SQLite
  // refuses to read rows from a statement that produces none.
  db.all('INSERT OR REPLACE INTO setting (key, value) VALUES (?, ?) RETURNING key', [KEY, created]);
  return created;
}
