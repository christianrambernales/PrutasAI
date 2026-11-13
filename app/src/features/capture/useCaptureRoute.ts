import { useCallback } from 'react';
import { insertScan, newScanUuid } from '../../core/db/repositories/scans';
import manifest from '../../core/ml/manifest.json';
import type { SqlDriver } from '../../core/db/driver';
import type { AppState } from '../../state/appState';
import type { Route, CaptureTarget } from '../../navigation/navState';
import type { PhotoStore } from '../../core/files/photoStore';
import { roundCoordinate } from '../../core/geo/geocoding';

export interface CaptureRouteInput {
  db: SqlDriver;
  photoStore: PhotoStore;
  savedLocation: AppState['savedLocation'];
  /** Invalidates every dataVersion-keyed read after a write. */
  bumpData: () => void;
  replace: (route: Route) => void;
  notify: (msg: string) => void;
  /** The verified local account scope at the instant the scan is saved. */
  accountId?: string | null;
  target?: CaptureTarget;
}

export interface CaptureRoute {
  onCaptured: (uri: string) => Promise<void>;
}

/** What a taken photo becomes: one stored scan, then the result screen. */
export function useCaptureRoute(input: CaptureRouteInput): CaptureRoute {
  const { db, photoStore, savedLocation, bumpData, replace, notify, accountId = null, target } = input;

  const onCaptured = useCallback(async (uri: string) => {
    let ownedUri: string | null = null;
    try {
      ownedUri = await photoStore.copyToOwned(uri);
      
      if (target?.type === 'checkpoint') {
        replace({ 
          name: 'monitoring', 
          sessionId: target.sessionId, 
          dayNumber: target.dayNumber,
          stagedPhotoUri: ownedUri 
        });
        return;
      }

      const scanId = newScanUuid();
      insertScan(db, {
        uuid: scanId,
        imageUri: ownedUri,
        createdAt: new Date().toISOString(),
        // No weights are installed, so nothing was inferred and nothing is
        // claimed. The row records the photo and the time, and that is all.
        fruitKey: null, fruitConf: null, varietyKey: null, varietyConf: null,
        bboxJson: null, manifestVersion: manifest.manifest_version,
        // The scan records where it was taken, if the user has set a place.
        // Already rounded to 2 dp in app state; the server rounds again.
        lat: savedLocation ? roundCoordinate(savedLocation.latitude) : null,
        lon: savedLocation ? roundCoordinate(savedLocation.longitude) : null,
        isOwnedPhoto: true,
        accountId,
      });
      bumpData();
      replace({ name: 'captureResult', scanId, photoUri: ownedUri, view: 'summary' });
    } catch (err) {
      if (ownedUri) {
        try {
          await photoStore.deleteOwned(ownedUri);
        } catch (cleanupErr) {
          // Ignore cleanup errors
        }
      }
      throw new Error('Failed to save the captured photo.');
    }
  }, [db, photoStore, savedLocation, bumpData, replace, notify, accountId, target]);

  return { onCaptured };
}
