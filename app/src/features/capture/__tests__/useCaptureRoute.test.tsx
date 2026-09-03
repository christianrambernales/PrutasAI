import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { useCaptureRoute, type CaptureRoute } from '../useCaptureRoute';
import { freshDb } from '../../../core/db/testing/scanFixtures';
import { listScanGroups } from '../../../core/db/repositories/scans';
import manifest from '../../../core/ml/manifest.json';
import type { SqlDriver } from '../../../core/db/driver';
import type { Route } from '../../../navigation/navState';

const PLACE = { label: 'Los Baños', latitude: 14.17, longitude: 121.24 };

function run(db: SqlDriver, savedLocation: typeof PLACE | null, replace: (r: Route) => void): CaptureRoute {
  let capture!: CaptureRoute;
  function Harness() {
    capture = useCaptureRoute({ db, savedLocation, bumpData: jest.fn(), replace });
    return null;
  }
  act(() => { renderer.create(<Harness />); });
  return capture;
}

test('a captured photo is stored and the result screen replaces the camera', () => {
  const db = freshDb();
  const replace = jest.fn();
  const capture = run(db, null, replace);

  act(() => { capture.onCaptured('file:///photo.jpg'); });

  const scans = listScanGroups(db).flatMap(g => g.scans);
  expect(scans).toHaveLength(1);
  expect(replace).toHaveBeenCalledWith({ name: 'captureResult', photoUri: 'file:///photo.jpg' });
});

test('a captured photo records the saved location and the manifest version', () => {
  const db = freshDb();
  const capture = run(db, PLACE, jest.fn());

  act(() => { capture.onCaptured('file:///photo.jpg'); });

  const rows = db.all<{ lat: number | null; lon: number | null; manifest_version: string }>(
    'SELECT lat, lon, manifest_version FROM scan',
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].lat).toBe(PLACE.latitude);
  expect(rows[0].lon).toBe(PLACE.longitude);
  expect(rows[0].manifest_version).toBe(manifest.manifest_version);
});
