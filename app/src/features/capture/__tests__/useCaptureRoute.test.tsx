import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { useCaptureRoute, type CaptureRoute } from '../useCaptureRoute';
import { freshDb } from '../../../core/db/testing/scanFixtures';
import { listScanGroups } from '../../../core/db/repositories/scans';
import manifest from '../../../core/ml/manifest.json';
import type { SqlDriver } from '../../../core/db/driver';
import type { Route } from '../../../navigation/navState';
import type { PhotoStore } from '../../../core/files/photoStore';

const PLACE = { label: 'Los Baños', latitude: 14.17, longitude: 121.24 };

class MockPhotoStore implements PhotoStore {
  copyToOwned = jest.fn(async (uri) => `file:///owned/${uri.split('/').pop()}`);
  deleteOwned = jest.fn(async () => {});
}

function run(db: SqlDriver, photoStore: PhotoStore, savedLocation: typeof PLACE | null, replace: (r: Route) => void, notify: (msg: string) => void): CaptureRoute {
  let capture!: CaptureRoute;
  function Harness() {
    capture = useCaptureRoute({ db, photoStore, savedLocation, bumpData: jest.fn(), replace, notify });
    return null;
  }
  act(() => { renderer.create(<Harness />); });
  return capture;
}

test('a captured photo is stored and the result screen replaces the camera', async () => {
  const db = freshDb();
  const replace = jest.fn();
  const notify = jest.fn();
  const photoStore = new MockPhotoStore();
  const capture = run(db, photoStore, null, replace, notify);

  await act(async () => { await capture.onCaptured('file:///photo.jpg'); });

  const scans = listScanGroups(db).flatMap(g => g.scans);
  expect(scans).toHaveLength(1);
  expect(scans[0].imageUri).toBe('file:///owned/photo.jpg');
  expect(photoStore.copyToOwned).toHaveBeenCalledWith('file:///photo.jpg');
  expect(replace).toHaveBeenCalledWith({ name: 'captureResult', photoUri: 'file:///owned/photo.jpg' });
  expect(notify).not.toHaveBeenCalled();
});

test('a captured photo records the saved location and the manifest version', async () => {
  const db = freshDb();
  const photoStore = new MockPhotoStore();
  const capture = run(db, photoStore, PLACE, jest.fn(), jest.fn());

  await act(async () => { await capture.onCaptured('file:///photo.jpg'); });

  const rows = db.all<{ lat: number | null; lon: number | null; manifest_version: string }>(
    'SELECT lat, lon, manifest_version FROM scan',
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].lat).toBe(PLACE.latitude);
  expect(rows[0].lon).toBe(PLACE.longitude);
  expect(rows[0].manifest_version).toBe(manifest.manifest_version);
});

test('insert failure removes only the owned file and notifies error', async () => {
  const db = freshDb();
  // Drop table to force an insert error
  db.exec('DROP TABLE scan');
  const replace = jest.fn();
  const notify = jest.fn();
  const photoStore = new MockPhotoStore();
  const capture = run(db, photoStore, null, replace, notify);

  await act(async () => { await capture.onCaptured('file:///photo.jpg'); });

  expect(photoStore.copyToOwned).toHaveBeenCalledWith('file:///photo.jpg');
  expect(photoStore.deleteOwned).toHaveBeenCalledWith('file:///owned/photo.jpg');
  expect(replace).not.toHaveBeenCalled();
  expect(notify).toHaveBeenCalledWith('Failed to save the captured photo.');
});
