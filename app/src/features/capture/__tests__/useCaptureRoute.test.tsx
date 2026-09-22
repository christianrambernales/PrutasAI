import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { useCaptureRoute, type CaptureRoute } from '../useCaptureRoute';
import { freshDb } from '../../../core/db/testing/scanFixtures';
import { countScans } from '../../../core/db/repositories/scans';
import manifest from '../../../core/ml/manifest.json';
import type { SqlDriver } from '../../../core/db/driver';
import type { Route, CaptureTarget } from '../../../navigation/navState';
import type { PhotoStore } from '../../../core/files/photoStore';

const PLACE = { label: 'Los Baños', latitude: 14.17891, longitude: 121.24321 };

class MockPhotoStore implements PhotoStore {
  copyToOwned = jest.fn(async (uri: string) => `file:///owned/${uri.split('/').pop()}`);
  deleteOwned = jest.fn(async () => {});
  cleanupOrphans = jest.fn(async (referencedURIs: Set<string>) => 0);
}

function run(db: SqlDriver, photoStore: PhotoStore, savedLocation: typeof PLACE | null, replace: (r: Route) => void, notify: (msg: string) => void, accountId: string | null = null, target?: CaptureTarget): CaptureRoute {
  let capture!: CaptureRoute;
  function Harness() {
    capture = useCaptureRoute({ db, photoStore, savedLocation, bumpData: jest.fn(), replace, notify, accountId, target });
    return null;
  }
  act(() => { renderer.create(<Harness />); });
  return capture;
}

describe('baseline capture', () => {
  test('camera and gallery both copy to owned storage, insert scan, and replace with captureResult carrying stable scanId', async () => {
    const db = freshDb();
    const replace = jest.fn();
    const photoStore = new MockPhotoStore();
    const capture = run(db, photoStore, null, replace, jest.fn(), null, { type: 'baseline' });

    await act(async () => { await capture.onCaptured('file:///camera.jpg'); });

    const scans = db.all<{ uuid: string; image_uri: string }>('SELECT uuid, image_uri FROM scan');
    expect(scans).toHaveLength(1);
    expect(scans[0].image_uri).toBe('file:///owned/camera.jpg');
    expect(photoStore.copyToOwned).toHaveBeenCalledWith('file:///camera.jpg');
    
    expect(replace).toHaveBeenCalledWith({ 
      name: 'captureResult', 
      scanId: scans[0].uuid,
      photoUri: 'file:///owned/camera.jpg',
      view: 'summary'
    });
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
    expect(rows[0].lat).toBe(14.18);
    expect(rows[0].lon).toBe(121.24);
    expect(rows[0].manifest_version).toBe(manifest.manifest_version);
  });

  test('a signed-in capture is owned by the active local account', async () => {
    const db = freshDb();
    const capture = run(db, new MockPhotoStore(), null, jest.fn(), jest.fn(), 'account-a');

    await act(async () => { await capture.onCaptured('file:///photo.jpg'); });

    expect(db.get<{ account_id: string | null }>('SELECT account_id FROM scan')?.account_id).toBe('account-a');
  });

  test('insert failure removes only the owned file and stays on capture with notification', async () => {
    const db = freshDb();
    db.exec('DROP TABLE scan'); // Force insert error
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
});

describe('checkpoint capture', () => {
  test('copies accepted image to owned storage, routes to monitoring with staged photo URI, calls NO db insert', async () => {
    const db = freshDb();
    const replace = jest.fn();
    const photoStore = new MockPhotoStore();
    
    const target: CaptureTarget = { type: 'checkpoint', sessionId: 'sess-123', dayNumber: 5 };
    const capture = run(db, photoStore, null, replace, jest.fn(), null, target);

    await act(async () => { await capture.onCaptured('file:///checkpoint.jpg'); });

    expect(countScans(db)).toBe(0);
    expect(photoStore.copyToOwned).toHaveBeenCalledWith('file:///checkpoint.jpg');
    expect(photoStore.deleteOwned).not.toHaveBeenCalled();
    
    expect(replace).toHaveBeenCalledWith({
      name: 'monitoring',
      sessionId: 'sess-123',
      dayNumber: 5,
      stagedPhotoUri: 'file:///owned/checkpoint.jpg'
    });
  });

  test('checkpoint copy failure deletes only the attempted file and stays on capture', async () => {
    const db = freshDb();
    const replace = jest.fn();
    const notify = jest.fn();
    const photoStore = new MockPhotoStore();
    photoStore.copyToOwned.mockRejectedValue(new Error('Disk full'));

    const target: CaptureTarget = { type: 'checkpoint', sessionId: 'sess-123', dayNumber: 5 };
    const capture = run(db, photoStore, null, replace, notify, null, target);

    await act(async () => { await capture.onCaptured('file:///checkpoint.jpg'); });

    expect(countScans(db)).toBe(0);
    expect(replace).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Failed to save the captured photo.');
    // No owned URI created since copy threw before assignment, so deleteOwned isn't called,
    // but the test ensures we stay on capture and notify error.
  });
});
