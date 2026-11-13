import type { SqlDriver } from '../db/driver';
import { getScanPhotoForHardDelete, hardDeleteScan, listTrashedScans } from '../db/repositories/scans';
import type { PhotoStore } from '../files/photoStore';

export interface PurgeScanTrashOptions {
  db: SqlDriver;
  photoStore: PhotoStore;
}

/**
 * Permanently deletes scans that are in the trash.
 * Deletes the row only after file handling reaches a defined safe outcome.
 */
export async function purgeScanTrash(
  uuid: string,
  options: PurgeScanTrashOptions
): Promise<void> {
  const { db, photoStore } = options;
  const photo = getScanPhotoForHardDelete(db, uuid);
  if (!photo) return; // Row doesn't exist

  if (photo.isOwned) {
    try {
      await photoStore.deleteOwned(photo.imageUri);
    } catch (e) {
      // If it fails to delete the file (e.g. permission error, IO error),
      // we must not delete the row, so the retry logic can attempt again.
      throw e;
    }
  }

  hardDeleteScan(db, uuid);
}

/**
 * Sweeps the photo directory for orphan files that are not referenced by any active or trashed scan.
 * Returns the number of orphans deleted.
 */
export async function cleanupOrphanPhotos(
  db: SqlDriver,
  photoStore: PhotoStore
): Promise<number> {
  // Get all URIs referenced in the scan table (both active and trashed)
  const rows = db.all<{ image_uri: string }>('SELECT image_uri FROM scan WHERE is_owned_photo = 1');
  const referencedURIs = new Set(rows.map(r => r.image_uri));
  
  return photoStore.cleanupOrphans(referencedURIs);
}
