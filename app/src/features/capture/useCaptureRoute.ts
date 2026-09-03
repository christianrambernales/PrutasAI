import { useCallback } from 'react';
import { insertScan, newScanUuid } from '../../core/db/repositories/scans';
import manifest from '../../core/ml/manifest.json';
import type { SqlDriver } from '../../core/db/driver';
import type { AppState } from '../../state/appState';
import type { Route } from '../../navigation/navState';

export interface CaptureRouteInput {
  db: SqlDriver;
  savedLocation: AppState['savedLocation'];
  /** Invalidates every dataVersion-keyed read after a write. */
  bumpData: () => void;
  replace: (route: Route) => void;
}

export interface CaptureRoute {
  onCaptured: (uri: string) => void;
}

/** What a taken photo becomes: one stored scan, then the result screen. */
export function useCaptureRoute(input: CaptureRouteInput): CaptureRoute {
  const { db, savedLocation, bumpData, replace } = input;

  const onCaptured = useCallback((uri: string) => {
    insertScan(db, {
      uuid: newScanUuid(),
      imageUri: uri,
      createdAt: new Date().toISOString(),
      // No weights are installed, so nothing was inferred and nothing is
      // claimed. The row records the photo and the time, and that is all.
      fruitKey: null, fruitConf: null, varietyKey: null, varietyConf: null,
      bboxJson: null, manifestVersion: manifest.manifest_version,
      // The scan records where it was taken, if the user has set a place.
      // Already rounded to 2 dp in app state; the server rounds again.
      lat: savedLocation?.latitude ?? null,
      lon: savedLocation?.longitude ?? null,
    });
    bumpData();
    replace({ name: 'captureResult', photoUri: uri });
  }, [db, savedLocation, bumpData, replace]);

  return { onCaptured };
}
