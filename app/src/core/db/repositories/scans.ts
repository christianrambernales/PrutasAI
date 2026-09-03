import type { SqlDriver } from '../driver';
import type { ScanGroup, ScanSummary } from '../../../features/viewModels';

export interface NewScan {
  uuid: string;
  imageUri: string;
  createdAt: string;
  fruitKey: string | null;
  fruitConf: number | null;
  varietyKey: string | null;
  varietyConf: number | null;
  bboxJson: string | null;
  manifestVersion: number | null;
  /**
   * A per-scan fact, not an incidental detail: required rather than optional
   * so a call site cannot silently drop the location by forgetting the field.
   * Null means the scan was taken before the user set a place — permanent,
   * never backfilled.
   */
  lat: number | null;
  lon: number | null;
  /**
   * Null means "not yet pushed", which is what makes this row part of the
   * queue. Restored rows arrive already synced so the drain does not send
   * them straight back.
   */
  syncedAt?: string | null;
}

/** A history row plus the photo it was taken from, for reopening a scan. */
export interface StoredScan extends ScanSummary {
  imageUri: string;
}

interface ScanRow {
  uuid: string;
  image_uri: string;
  fruit_key: string | null;
  variety_key: string | null;
  created_at: string;
  fruit_name: string | null;
  fruit_emoji: string | null;
  variety_name: string | null;
}

const SELECT_SCAN = `SELECT s.uuid, s.image_uri, s.fruit_key, s.variety_key, s.created_at,
                            f.name_en AS fruit_name, f.emoji AS fruit_emoji, v.name_en AS variety_name
                       FROM scan s
                       LEFT JOIN fruit f   ON f.key = s.fruit_key
                       LEFT JOIN variety v ON v.key = s.variety_key`;

const HEX = '0123456789abcdef';

function hex(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += HEX[Math.floor(Math.random() * 16)];
  return out;
}

/**
 * A version-4 UUID.
 *
 * Shaped rather than arbitrary because the sync endpoint validates the shape:
 * an id the server rejects would strand the row on the device with no sign
 * anything was wrong.
 */
export function newScanUuid(): string {
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${HEX[8 + Math.floor(Math.random() * 4)]}${hex(3)}-${hex(12)}`;
}

/**
 * INSERT OR IGNORE: replaying a queue must not duplicate a scan.
 *
 * RETURNING is not decoration — the driver contract exposes only row-returning
 * calls, and SQLite refuses to read rows from a statement that produces none.
 */
export function insertScan(db: SqlDriver, scan: NewScan): string {
  db.all(
    `INSERT OR IGNORE INTO scan
       (uuid, image_uri, fruit_key, fruit_conf, variety_key, variety_conf,
        bbox_json, manifest_version, lat, lon, created_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING uuid`,
    [
      scan.uuid, scan.imageUri, scan.fruitKey, scan.fruitConf, scan.varietyKey,
      scan.varietyConf, scan.bboxJson, scan.manifestVersion, scan.lat, scan.lon,
      scan.createdAt, scan.syncedAt ?? null,
    ],
  );
  return scan.uuid;
}

export function countScans(db: SqlDriver): number {
  const row = db.get<{ n: number }>('SELECT COUNT(*) AS n FROM scan');
  return row?.n ?? 0;
}

function timeLabel(iso: string, now: Date): string {
  const at = new Date(iso);
  const sameDay = at.toDateString() === now.toDateString();
  if (sameDay) {
    return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  }
  return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupLabel(iso: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'TODAY';
  if (days < 7) return 'THIS WEEK';
  return 'EARLIER';
}

/**
 * Severity is `undetermined` for every row and the detail never names a
 * disease: no disease model exists, so there is nothing to report. The row
 * states what was recorded and stops there.
 */
function toSummary(row: ScanRow, now: Date): StoredScan {
  return {
    id: row.uuid,
    // Empty means the row was restored from another device: the photograph
    // never left that phone, so there is nothing here to show. The result
    // screen renders the absence rather than a stand-in.
    imageUri: row.image_uri,
    emoji: row.fruit_emoji ?? '🌱',
    title: row.fruit_name
      ? [row.fruit_name, row.variety_name].filter(Boolean).join(' · ')
      : 'Unidentified',
    status: 'undetermined',
    detail: row.fruit_name ? 'No disease model' : 'Not identified — no model installed',
    timeLabel: timeLabel(row.created_at, now),
  };
}

/** History, newest first, grouped by recency. */
export function listScanGroups(db: SqlDriver, now: Date = new Date()): ScanGroup[] {
  const rows = db.all<ScanRow>(`${SELECT_SCAN} ORDER BY s.created_at DESC`);
  const groups = new Map<string, ScanSummary[]>();

  for (const row of rows) {
    const label = groupLabel(row.created_at, now);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(toSummary(row, now));
  }

  return [...groups.entries()].map(([label, scans]) => ({ label, scans }));
}

/** One stored scan, or null — never a stand-in row. */
export function findScan(db: SqlDriver, uuid: string, now: Date = new Date()): StoredScan | null {
  const row = db.get<ScanRow>(`${SELECT_SCAN} WHERE s.uuid = ?`, [uuid]);
  return row ? toSummary(row, now) : null;
}

export interface PendingScan {
  uuid: string;
  imageUri: string;
  createdAt: string;
  fruitKey: string | null;
  fruitConf: number | null;
  varietyKey: string | null;
  varietyConf: number | null;
  bboxJson: string | null;
  manifestVersion: number | null;
  lat: number | null;
  lon: number | null;
}

interface PendingRow {
  uuid: string;
  image_uri: string;
  created_at: string;
  fruit_key: string | null;
  fruit_conf: number | null;
  variety_key: string | null;
  variety_conf: number | null;
  bbox_json: string | null;
  manifest_version: number | null;
  lat: number | null;
  lon: number | null;
}

/**
 * The upload queue. `synced_at IS NULL` is the queue — there is no second
 * table to keep consistent with this one.
 *
 * Oldest first, so a backlog uploads in the order the scans happened.
 */
export function pendingScans(db: SqlDriver, limit = 50): PendingScan[] {
  const rows = db.all<PendingRow>(
    `SELECT uuid, image_uri, created_at, fruit_key, fruit_conf,
            variety_key, variety_conf, bbox_json, manifest_version, lat, lon
       FROM scan
      WHERE synced_at IS NULL
      ORDER BY created_at ASC
      LIMIT ?`,
    [limit],
  );

  return rows.map(row => ({
    uuid: row.uuid,
    imageUri: row.image_uri,
    createdAt: row.created_at,
    fruitKey: row.fruit_key,
    fruitConf: row.fruit_conf,
    varietyKey: row.variety_key,
    varietyConf: row.variety_conf,
    bboxJson: row.bbox_json,
    manifestVersion: row.manifest_version,
    lat: row.lat,
    lon: row.lon,
  }));
}

export function markSynced(db: SqlDriver, uuid: string, syncedAt: string): void {
  db.all('UPDATE scan SET synced_at = ? WHERE uuid = ? RETURNING uuid', [syncedAt, uuid]);
}

/**
 * Re-queues the whole table by clearing the marker that defines the queue.
 *
 * Signing in must re-upload everything held locally, and `synced_at IS NULL`
 * is already the queue — so this needs no second mechanism to keep consistent.
 */
export function resetSyncQueue(db: SqlDriver): void {
  db.all('UPDATE scan SET synced_at = NULL RETURNING uuid');
}
