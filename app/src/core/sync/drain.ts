/**
 * Push-only sync.
 *
 * The device database is the source of truth and no screen waits on this, so
 * the drain is fire-and-forget: it reports what happened and never throws.
 *
 * The photograph is not in the payload and never will be. Detection runs on
 * the phone, so there is no reason for an image to leave it, and the consent
 * screen promises exactly that.
 */

import type { SqlDriver } from '../db/driver';
import { markSynced, pendingScans } from '../db/repositories/scans';

export interface DrainOptions {
  db: SqlDriver;
  /** The API base, e.g. `https://x.vercel.app/api`. Empty means unconfigured. */
  baseUrl: string;
  deviceId: string;
  /** The signed-in user's access token. Empty means offline: nothing uploads. */
  accessToken: string;
  fetchImpl?: typeof fetch;
  limit?: number;
  now?: () => Date;
}

export interface DrainReport {
  attempted: number;
  synced: number;
  failed: number;
  /**
   * The API answered 401: the session is gone, not the scans. Reported
   * separately from `failed` because the caller's response is different — a
   * transport failure retries silently, an expired session has to be said out
   * loud and the account treated as signed out.
   */
  sessionExpired: boolean;
}

export async function drainScans(options: DrainOptions): Promise<DrainReport> {
  const { db, baseUrl, deviceId, accessToken, fetchImpl = fetch, limit = 50, now = () => new Date() } = options;

  const report: DrainReport = { attempted: 0, synced: 0, failed: 0, sessionExpired: false };
  // No account, no upload. This is offline mode working, not an error, so it
  // is as silent as an unconfigured baseUrl.
  if (baseUrl.trim() === '' || accessToken.trim() === '') return report;

  const endpoint = `${baseUrl.trim()}/v1/scans`;

  for (const scan of pendingScans(db, limit)) {
    report.attempted += 1;

    // The allow-list rejects unknown fields, so send exactly what it accepts —
    // and note image_uri is absent by choice, not by omission.
    const body = {
      uuid: scan.uuid,
      created_at: scan.createdAt,
      ...(scan.fruitKey === null ? {} : { fruit_key: scan.fruitKey }),
      ...(scan.fruitConf === null ? {} : { fruit_conf: scan.fruitConf }),
      ...(scan.varietyKey === null ? {} : { variety_key: scan.varietyKey }),
      ...(scan.varietyConf === null ? {} : { variety_conf: scan.varietyConf }),
      // bbox_json is always null today, so this branch never fires in
      // practice. If a detector ever populates it, the consent copy
      // (consentSentList / dataDisclosureDetail in ui/i18n/strings.ts) must
      // name it before that ships — right now it only discloses the fields
      // actually sent.
      ...(scan.bboxJson === null ? {} : { bbox_json: scan.bboxJson }),
      ...(scan.manifestVersion === null ? {} : { manifest_version: scan.manifestVersion }),
      // Absent means absent: a null key would assert the device knows a
      // location it does not. Only present the keys when there is a value.
      ...(scan.lat === null ? {} : { lat: scan.lat }),
      ...(scan.lon === null ? {} : { lon: scan.lon }),
    };

    let status: number;
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      status = response.status;
    } catch {
      report.failed += 1;
      return report;
    }

    // 401 means the session expired, not that the scan is unacceptable. The
    // generic 4xx branch below would mark it synced and silently drop the
    // whole backlog, so stop here and leave everything queued for the next
    // sign-in.
    if (status === 401) {
      report.failed += 1;
      report.sessionExpired = true;
      return report;
    }

    // Throttled: stop. Continuing would spend the whole window on rejections
    // and the backlog is not going anywhere.
    if (status === 429) return report;

    // A 4xx other than 429 means this row will never be accepted in this
    // shape. Retrying it forever is a permanently stuck queue that blocks
    // every scan behind it, so record it as done and move on.
    if (status < 300 || (status >= 400 && status < 500)) {
      markSynced(db, scan.uuid, now().toISOString());
      report.synced += 1;
      continue;
    }

    report.failed += 1;
  }

  return report;
}
