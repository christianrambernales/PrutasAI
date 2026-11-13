/**
 * Restore — the feature accounts exist for: history follows you to a new
 * phone.
 *
 * Restoring is a read of the user's own rows and goes straight to Supabase,
 * where the `scan_select_own` policy is the authorisation check — writing
 * our own would only duplicate it, with a chance of getting it wrong.
 *
 * This is the only read path in the app. Everything else renders from the
 * device database.
 */

import type { SqlDriver } from '../db/driver';
import { insertScan, markConflict } from '../db/repositories/scans';
import { supabaseClient } from './supabase';

export interface RemoteScan {
  id: string;
  created_at: string;
  fruit_key: string | null;
  fruit_conf: number | null;
  variety_key: string | null;
  variety_conf: number | null;
  bbox_json: unknown;
  manifest_version: number | null;
  lat: number | null;
  lon: number | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface RestoreOptions {
  db: SqlDriver;
  fetchRemoteScans?: () => Promise<RemoteScan[]>;
  now?: () => Date;
  /** Verified session owner. Restored rows are never assigned from remote data. */
  userId?: string;
}

export interface RestoreReport {
  restored: number;
  /**
   * True when the read of the account's rows failed. The upload succeeded
   * earlier — these rows exist server-side — but this device could not show
   * them yet.
   */
  restoreFailed: boolean;
}

async function defaultFetchRemoteScans(): Promise<RemoteScan[]> {
  const supabase = supabaseClient();
  if (!supabase) return [];

  // RLS restricts this to the signed-in user's own rows. No user filter is
  // written here on purpose: a hand-written one would imply the policy is
  // optional.
  // Known limitation, not implemented here: PostgREST caps a query at 1000
  // rows by default with no override on this call, so a user with more than
  // 1000 scans restores only the newest 1000. Not paginated — recording the
  // cap, not fixing it.
  const { data, error } = await supabase
    .from('scan')
    .select('id, created_at, updated_at, deleted_at, fruit_key, fruit_conf, variety_key, variety_conf, bbox_json, manifest_version, lat, lon')
    .order('created_at', { ascending: false });

  // Throw rather than return []: the caller must be able to tell "nothing to
  // restore" apart from "the fetch failed", and swallowing it here made every
  // failure look like a user with zero prior scans.
  if (error) throw new Error(error.message);
  return (data ?? []) as RemoteScan[];
}

export async function restoreScans(options: RestoreOptions): Promise<RestoreReport> {
  const {
    db,
    fetchRemoteScans = defaultFetchRemoteScans,
    now = () => new Date(),
    userId,
  } = options;

  const report: RestoreReport = { restored: 0, restoreFailed: false };

  let remote: RemoteScan[];
  try {
    remote = await fetchRemoteScans();
  } catch {
    // Report the failure rather than a silent {restored: 0}, which reads
    // identically to "you had nothing to restore".
    report.restoreFailed = true;
    return report;
  }

  const syncedAt = now().toISOString();
  for (const row of remote) {
    const remoteUpdatedAt = row.updated_at ?? row.created_at;
    const remoteTime = Date.parse(remoteUpdatedAt);
    const remoteDeletedTime = row.deleted_at === null || row.deleted_at === undefined ? null : Date.parse(row.deleted_at);
    const local = db.get<{ account_id: string | null; updated_at: string; deleted_at: string | null }>(
      'SELECT account_id, updated_at, deleted_at FROM scan WHERE uuid = ?', [row.id],
    );
    if (!Number.isFinite(remoteTime) || (remoteDeletedTime !== null && !Number.isFinite(remoteDeletedTime))) {
      if (local && (!userId || local.account_id === userId)) markConflict(db, row.id, 'invalid_remote_timestamp', userId ? { activeAccountId: userId } : undefined, syncedAt);
      continue;
    }
    if (local) {
      if (userId && local.account_id !== userId) continue;
      const localTime = Date.parse(local.updated_at);
      if (!Number.isFinite(localTime)) {
        markConflict(db, row.id, 'invalid_local_timestamp', userId ? { activeAccountId: userId } : undefined, syncedAt);
        continue;
      }
      // Equal is a replay no-op. A local newer change remains pending. A remote
      // deletion with the newest valid timestamp beats an older local edit.
      if (remoteTime <= localTime || (remoteDeletedTime !== null && remoteDeletedTime < localTime)) {
        report.restored += 1;
        continue;
      }
      db.all(
        `UPDATE scan SET fruit_key = ?, fruit_conf = ?, variety_key = ?, variety_conf = ?,
            bbox_json = ?, manifest_version = ?, lat = ?, lon = ?, deleted_at = ?,
            updated_at = ?, synced_at = ?, sync_status = 'synced', sync_error_code = NULL,
            retry_count = 0, next_retry_at = NULL WHERE uuid = ? AND account_id ${userId ? '= ?' : 'IS NULL'}`,
        [row.fruit_key, row.fruit_conf, row.variety_key, row.variety_conf,
          row.bbox_json === null ? null : JSON.stringify(row.bbox_json), row.manifest_version,
          row.lat, row.lon, row.deleted_at ?? null, remoteUpdatedAt, syncedAt, row.id, ...(userId ? [userId] : [])],
      );
      report.restored += 1;
      continue;
    }
    // INSERT OR IGNORE keys on uuid, so a scan already held locally keeps its
    // own photograph and is not overwritten by a photo-less copy.
    insertScan(db, {
      uuid: row.id,
      // The photograph never left the phone that took it, so there is none to
      // restore. The result screen says so rather than showing a stand-in.
      imageUri: '',
      createdAt: row.created_at,
      updatedAt: remoteUpdatedAt,
      fruitKey: row.fruit_key,
      fruitConf: row.fruit_conf,
      varietyKey: row.variety_key,
      varietyConf: row.variety_conf,
      bboxJson: row.bbox_json === null ? null : JSON.stringify(row.bbox_json),
      manifestVersion: row.manifest_version,
      // A restored scan keeps the location it was taken at — that is a real
      // fact about the original scan, unlike the photograph.
      lat: row.lat,
      lon: row.lon,
      // Already on the server: the drain must not push it straight back.
      syncedAt,
      accountId: userId ?? null,
    });
    report.restored += 1;
  }

  return report;
}
