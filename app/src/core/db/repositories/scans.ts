import type { SqlDriver } from '../driver';
import type { ScanGroup, ScanSummary } from '../../../features/viewModels';

export interface LocalAccountScope {
  activeAccountId: string | null;
}

export type SyncStatus = 'pending' | 'synced' | 'needs_attention' | 'conflict';

export function buildScopeCondition(
  scope: LocalAccountScope = { activeAccountId: null },
  tableAlias = 's',
): { clause: string; params: unknown[] } {
  if (scope.activeAccountId !== null) {
    return {
      clause: `(${tableAlias}.account_id = ? OR ${tableAlias}.account_id IS NULL)`,
      params: [scope.activeAccountId],
    };
  }
  return {
    clause: `${tableAlias}.account_id IS NULL`,
    params: [],
  };
}

export interface NewScan {
  uuid: string;
  imageUri: string;
  createdAt: string;
  updatedAt?: string;
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
  /** True if the photo is in the app-owned directory and should be deleted with the row */
  isOwnedPhoto?: boolean;
  accountId?: string | null;
  syncStatus?: SyncStatus;
  syncErrorCode?: string | null;
  retryCount?: number;
  nextRetryAt?: string | null;
}

/** A history row plus the photo it was taken from, for reopening a scan. */
export interface StoredScan extends ScanSummary {
  imageUri: string;
  accountId?: string | null;
  updatedAt?: string;
  syncStatus?: SyncStatus;
  syncErrorCode?: string | null;
  retryCount?: number;
  nextRetryAt?: string | null;
}

interface ScanRow {
  uuid: string;
  image_uri: string;
  fruit_key: string | null;
  variety_key: string | null;
  created_at: string;
  updated_at: string;
  fruit_name: string | null;
  fruit_name_fil: string | null;
  fruit_emoji: string | null;
  variety_name: string | null;
  variety_name_fil: string | null;
  account_id: string | null;
  sync_status: SyncStatus;
  sync_error_code: string | null;
  retry_count: number;
  next_retry_at: string | null;
}

const SELECT_SCAN = `SELECT s.uuid, s.image_uri, s.fruit_key, s.variety_key, s.created_at, s.updated_at,
                            f.name_en AS fruit_name, f.name_fil AS fruit_name_fil,
                            f.emoji AS fruit_emoji, v.name_en AS variety_name,
                            v.name_fil AS variety_name_fil,
                            s.account_id, s.sync_status, s.sync_error_code, s.retry_count, s.next_retry_at
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
  const updatedAt = scan.updatedAt ?? scan.createdAt;
  const syncStatus: SyncStatus = scan.syncStatus ?? (scan.syncedAt ? 'synced' : 'pending');
  db.all(
    `INSERT OR IGNORE INTO scan
       (uuid, image_uri, fruit_key, fruit_conf, variety_key, variety_conf,
        bbox_json, manifest_version, lat, lon, created_at, updated_at, synced_at,
        is_owned_photo, account_id, sync_status, sync_error_code, retry_count, next_retry_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING uuid`,
    [
      scan.uuid,
      scan.imageUri,
      scan.fruitKey,
      scan.fruitConf,
      scan.varietyKey,
      scan.varietyConf,
      scan.bboxJson,
      scan.manifestVersion,
      scan.lat,
      scan.lon,
      scan.createdAt,
      updatedAt,
      scan.syncedAt ?? null,
      scan.isOwnedPhoto ? 1 : 0,
      scan.accountId ?? null,
      syncStatus,
      scan.syncErrorCode ?? null,
      scan.retryCount ?? 0,
      scan.nextRetryAt ?? null,
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
    createdAtIso: row.created_at,
    fruitNameEn: row.fruit_name,
    fruitNameFil: row.fruit_name_fil,
    varietyNameEn: row.variety_name,
    varietyNameFil: row.variety_name_fil,
    emoji: row.fruit_emoji ?? '🌱',
    title: row.fruit_name
      ? [row.fruit_name, row.variety_name].filter(Boolean).join(' · ')
      : 'Unidentified',
    status: 'undetermined',
    detail: row.fruit_name ? 'No disease model' : 'Not identified — no model installed',
    timeLabel: timeLabel(row.created_at, now),
    fruitKey: row.fruit_key,
    accountId: row.account_id,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    syncErrorCode: row.sync_error_code,
    retryCount: row.retry_count,
    nextRetryAt: row.next_retry_at,
  };
}

/** History, newest first, grouped by recency. Excludes trashed scans. Scoped by LocalAccountScope. */
export function listScanGroups(
  db: SqlDriver,
  scopeOrNow?: LocalAccountScope | Date,
  nowOrScope?: Date | LocalAccountScope,
): ScanGroup[] {
  let scope: LocalAccountScope = { activeAccountId: null };
  let now: Date = new Date();

  if (scopeOrNow instanceof Date) {
    now = scopeOrNow;
    if (nowOrScope && 'activeAccountId' in nowOrScope) {
      scope = nowOrScope;
    }
  } else if (scopeOrNow && 'activeAccountId' in scopeOrNow) {
    scope = scopeOrNow;
    if (nowOrScope instanceof Date) {
      now = nowOrScope;
    }
  }

  const { clause, params } = buildScopeCondition(scope, 's');
  const rows = db.all<ScanRow>(
    `${SELECT_SCAN} WHERE s.deleted_at IS NULL AND ${clause} ORDER BY s.created_at DESC`,
    params,
  );
  const groups = new Map<string, ScanSummary[]>();

  for (const row of rows) {
    const label = groupLabel(row.created_at, now);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(toSummary(row, now));
  }

  return [...groups.entries()].map(([label, scans]) => ({ label, scans }));
}

/** One stored scan, or null — never a stand-in row. Scoped by LocalAccountScope. */
export function findScan(
  db: SqlDriver,
  uuid: string,
  scopeOrNow?: LocalAccountScope | Date,
  nowOrScope?: Date | LocalAccountScope,
): StoredScan | null {
  let scope: LocalAccountScope = { activeAccountId: null };
  let now: Date = new Date();

  if (scopeOrNow instanceof Date) {
    now = scopeOrNow;
    if (nowOrScope && 'activeAccountId' in nowOrScope) {
      scope = nowOrScope;
    }
  } else if (scopeOrNow && 'activeAccountId' in scopeOrNow) {
    scope = scopeOrNow;
    if (nowOrScope instanceof Date) {
      now = nowOrScope;
    }
  }

  const { clause, params } = buildScopeCondition(scope, 's');
  const row = db.get<ScanRow>(
    `${SELECT_SCAN} WHERE s.uuid = ? AND s.deleted_at IS NULL AND ${clause}`,
    [uuid, ...params],
  );
  return row ? toSummary(row, now) : null;
}

export interface PendingScan {
  uuid: string;
  createdAt: string;
  updatedAt: string;
  fruitKey: string | null;
  fruitConf: number | null;
  varietyKey: string | null;
  varietyConf: number | null;
  bboxJson: string | null;
  manifestVersion: number | null;
  lat: number | null;
  lon: number | null;
  deletedAt: string | null;
  accountId: string | null;
  syncStatus: SyncStatus;
  syncErrorCode: string | null;
  retryCount: number;
  nextRetryAt: string | null;
}

/**
 * The upload queue. `sync_status = 'pending'` is the queue.
 *
 * Oldest first, so a backlog uploads in the order the scans happened.
 */
export function pendingScans(
  db: SqlDriver,
  limitOrScope: number | LocalAccountScope = 50,
  scopeOrLimit: LocalAccountScope | number = { activeAccountId: null },
  nowIso?: string,
): PendingScan[] {
  let limit = 50;
  let scope: LocalAccountScope = { activeAccountId: null };

  if (typeof limitOrScope === 'number') {
    limit = limitOrScope;
    if (typeof scopeOrLimit === 'object' && scopeOrLimit !== null && 'activeAccountId' in scopeOrLimit) {
      scope = scopeOrLimit;
    }
  } else if (typeof limitOrScope === 'object' && limitOrScope !== null && 'activeAccountId' in limitOrScope) {
    scope = limitOrScope;
    if (typeof scopeOrLimit === 'number') {
      limit = scopeOrLimit;
    }
  }

  const { clause, params } = buildScopeCondition(scope, 'scan');
  const timeClause = nowIso ? 'AND (next_retry_at IS NULL OR next_retry_at <= ?)' : '';
  const timeParams = nowIso ? [nowIso] : [];

  const rows = db.all<{
    uuid: string;
    created_at: string;
    updated_at: string;
    fruit_key: string | null;
    fruit_conf: number | null;
    variety_key: string | null;
    variety_conf: number | null;
    bbox_json: string | null;
    manifest_version: number | null;
    lat: number | null;
    lon: number | null;
    deleted_at: string | null;
    account_id: string | null;
    sync_status: SyncStatus;
    sync_error_code: string | null;
    retry_count: number;
    next_retry_at: string | null;
  }>(
    `SELECT uuid, created_at, updated_at, fruit_key, fruit_conf,
            variety_key, variety_conf, bbox_json, manifest_version, lat, lon, deleted_at,
            account_id, sync_status, sync_error_code, retry_count, next_retry_at
       FROM scan
      WHERE sync_status = 'pending' AND ${clause} ${timeClause}
      ORDER BY created_at ASC
      LIMIT ?`,
    [...params, ...timeParams, limit],
  );

  return rows.map(row => ({
    uuid: row.uuid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fruitKey: row.fruit_key,
    fruitConf: row.fruit_conf,
    varietyKey: row.variety_key,
    varietyConf: row.variety_conf,
    bboxJson: row.bbox_json,
    manifestVersion: row.manifest_version,
    lat: row.lat,
    lon: row.lon,
    deletedAt: row.deleted_at,
    accountId: row.account_id,
    syncStatus: row.sync_status,
    syncErrorCode: row.sync_error_code,
    retryCount: row.retry_count,
    nextRetryAt: row.next_retry_at,
  }));
}

export function markSynced(
  db: SqlDriver,
  uuid: string,
  syncedAt: string,
  scope?: LocalAccountScope,
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [syncedAt, syncedAt, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'scan');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE scan
        SET sync_status = 'synced',
            synced_at = ?,
            updated_at = ?,
            sync_error_code = NULL,
            retry_count = 0,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function markNeedsAttention(
  db: SqlDriver,
  uuid: string,
  errorCode: string,
  scope?: LocalAccountScope,
  nowIso: string = new Date().toISOString(),
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [errorCode, nowIso, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'scan');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE scan
        SET sync_status = 'needs_attention',
            sync_error_code = ?,
            updated_at = ?,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function markConflict(
  db: SqlDriver,
  uuid: string,
  errorCode: string,
  scope?: LocalAccountScope,
  nowIso: string = new Date().toISOString(),
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [errorCode, nowIso, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'scan');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE scan
        SET sync_status = 'conflict',
            sync_error_code = ?,
            updated_at = ?,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function scheduleScanRetry(
  db: SqlDriver,
  uuid: string,
  nextRetryAt: string,
  errorCode: string | null = null,
  scope?: LocalAccountScope,
  nowIso: string = new Date().toISOString(),
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [nextRetryAt, errorCode, nowIso, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'scan');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE scan
        SET sync_status = 'pending',
            next_retry_at = ?,
            sync_error_code = ?,
            retry_count = retry_count + 1,
            updated_at = ?
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function countScansBySyncStatus(
  db: SqlDriver,
  scope: LocalAccountScope = { activeAccountId: null },
): Record<SyncStatus, number> {
  const { clause, params } = buildScopeCondition(scope, 'scan');
  const rows = db.all<{ sync_status: SyncStatus; count: number }>(
    `SELECT sync_status, COUNT(*) as count
       FROM scan
      WHERE ${clause}
      GROUP BY sync_status`,
    params,
  );
  const counts: Record<SyncStatus, number> = {
    pending: 0,
    synced: 0,
    needs_attention: 0,
    conflict: 0,
  };
  for (const row of rows) {
    if (row.sync_status in counts) {
      counts[row.sync_status] = Number(row.count);
    }
  }
  return counts;
}

/**
 * Claim unowned scans for the active account.
 * Atomically re-assigns unowned rows (`account_id IS NULL`) to `accountId`.
 * Can NEVER reassign an already-owned row.
 */
export function claimUnownedScans(
  db: SqlDriver,
  accountId: string,
  nowIso: string = new Date().toISOString(),
): number {
  if (!accountId || !accountId.trim()) {
    throw new Error('accountId must be a non-empty string');
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE scan
        SET account_id = ?,
            updated_at = ?,
            sync_status = 'pending',
            synced_at = NULL
      WHERE account_id IS NULL
      RETURNING uuid`,
    [accountId, nowIso],
  );
  return rows.length;
}

/**
 * Local-only removal of downloaded/local scans for the specified account.
 * Deletes ONLY rows belonging to `accountId` from SQLite.
 * Never affects unowned rows, never touches other accounts, and never makes a network/cloud call.
 * Returns owned photo file URIs so the caller can clean them up from the device filesystem.
 */
export function removeLocalAccountScans(
  db: SqlDriver,
  accountId: string,
): { removedCount: number; ownedPhotoUris: string[] } {
  if (!accountId || !accountId.trim()) {
    throw new Error('accountId must be a non-empty string');
  }
  let result = { removedCount: 0, ownedPhotoUris: [] as string[] };
  db.transaction(() => {
    const rows = db.all<{ uuid: string; image_uri: string; is_owned_photo: number }>(
      'SELECT uuid, image_uri, is_owned_photo FROM scan WHERE account_id = ?',
      [accountId],
    );
    const ownedPhotoUris = rows
      .filter(r => r.is_owned_photo === 1 && r.image_uri && r.image_uri.trim() !== '')
      .map(r => r.image_uri);

    const deleted = db.all<{ uuid: string }>(
      'DELETE FROM scan WHERE account_id = ? RETURNING uuid',
      [accountId],
    );

    result = {
      removedCount: deleted.length,
      ownedPhotoUris,
    };
  });
  return result;
}

/**
 * Re-queues scans by resetting their sync status.
 * Scoped optionally by LocalAccountScope.
 */
export function resetSyncQueue(db: SqlDriver, scope?: LocalAccountScope): void {
  let where = '1 = 1';
  const params: unknown[] = [];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'scan');
    where = clause;
    params.push(...scopeParams);
  }
  db.all(
    `UPDATE scan
        SET sync_status = 'pending',
            synced_at = NULL,
            sync_error_code = NULL,
            retry_count = 0,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
}

export function softDeleteScan(
  db: SqlDriver,
  uuid: string,
  now: string,
  scope?: LocalAccountScope,
): void {
  let where = 'uuid = ?';
  const params: unknown[] = [now, now, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'scan');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  db.all(
    `UPDATE scan
        SET deleted_at = ?,
            updated_at = ?,
            sync_status = 'pending',
            synced_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
}

export function restoreScan(
  db: SqlDriver,
  uuid: string,
  now: string = new Date().toISOString(),
  scope?: LocalAccountScope,
): void {
  let where = 'uuid = ?';
  const params: unknown[] = [now, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'scan');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  db.all(
    `UPDATE scan
        SET deleted_at = NULL,
            updated_at = ?,
            sync_status = 'pending',
            synced_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
}

export function listTrashedScans(
  db: SqlDriver,
  scopeOrNow?: LocalAccountScope | Date,
  nowOrScope?: Date | LocalAccountScope,
): ScanSummary[] {
  let scope: LocalAccountScope = { activeAccountId: null };
  let now: Date = new Date();

  if (scopeOrNow instanceof Date) {
    now = scopeOrNow;
    if (nowOrScope && 'activeAccountId' in nowOrScope) {
      scope = nowOrScope;
    }
  } else if (scopeOrNow && 'activeAccountId' in scopeOrNow) {
    scope = scopeOrNow;
    if (nowOrScope instanceof Date) {
      now = nowOrScope;
    }
  }

  const { clause, params } = buildScopeCondition(scope, 's');
  const rows = db.all<ScanRow>(
    `${SELECT_SCAN} WHERE s.deleted_at IS NOT NULL AND ${clause} ORDER BY s.deleted_at DESC`,
    params,
  );
  return rows.map(row => toSummary(row, now));
}

export function getScanPhotoForHardDelete(
  db: SqlDriver,
  uuid: string,
  scope?: LocalAccountScope,
): { imageUri: string; isOwned: boolean } | null {
  let where = 'uuid = ?';
  const params: unknown[] = [uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'scan');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const row = db.get<{ image_uri: string; is_owned_photo: number }>(
    `SELECT image_uri, is_owned_photo FROM scan WHERE ${where}`,
    params,
  );
  return row ? { imageUri: row.image_uri, isOwned: row.is_owned_photo === 1 } : null;
}

export function hardDeleteScan(
  db: SqlDriver,
  uuid: string,
  scope?: LocalAccountScope,
): void {
  let where = 'uuid = ?';
  const params: unknown[] = [uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'scan');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  db.all(`DELETE FROM scan WHERE ${where} RETURNING uuid`, params);
}
