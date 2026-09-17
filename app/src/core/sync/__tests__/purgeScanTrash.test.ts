import { freshDb, sampleScan } from '../../db/testing/scanFixtures';
import { insertScan, softDeleteScan } from '../../db/repositories/scans';
import { cleanupOrphanPhotos, purgeScanTrash } from '../purgeScanTrash';
import type { PhotoStore } from '../../files/photoStore';

describe('purgeScanTrash', () => {
  test('hard deletes a scan and its owned photo', async () => {
    const db = freshDb();
    insertScan(db, sampleScan({ uuid: 'owned1', imageUri: 'file:///app/photos/1.jpg', isOwnedPhoto: true }));
    softDeleteScan(db, 'owned1', '2026-08-30T10:00:00.000Z');

    let deletedUri = '';
    const mockStore: PhotoStore = {
      copyToOwned: async () => '',
      deleteOwned: async (uri) => { deletedUri = uri; },
      cleanupOrphans: async () => 0,
    };

    await purgeScanTrash('owned1', { db, photoStore: mockStore });

    expect(deletedUri).toBe('file:///app/photos/1.jpg');
    // Row is gone
    const photo = db.get('SELECT * FROM scan WHERE uuid = ?', ['owned1']);
    expect(photo).toBeUndefined();
  });

  test('deletes the row but does not touch file if photo is not owned', async () => {
    const db = freshDb();
    insertScan(db, sampleScan({ uuid: 'unowned1', imageUri: 'file:///cache/1.jpg', isOwnedPhoto: false }));
    softDeleteScan(db, 'unowned1', '2026-08-30T10:00:00.000Z');

    let deleteCalled = false;
    const mockStore: PhotoStore = {
      copyToOwned: async () => '',
      deleteOwned: async () => { deleteCalled = true; },
      cleanupOrphans: async () => 0,
    };

    await purgeScanTrash('unowned1', { db, photoStore: mockStore });

    expect(deleteCalled).toBe(false);
    // Row is gone
    const photo = db.get('SELECT * FROM scan WHERE uuid = ?', ['unowned1']);
    expect(photo).toBeUndefined();
  });

  test('does not delete the row if file deletion throws', async () => {
    const db = freshDb();
    insertScan(db, sampleScan({ uuid: 'owned1', imageUri: 'file:///app/photos/1.jpg', isOwnedPhoto: true }));

    const mockStore: PhotoStore = {
      copyToOwned: async () => '',
      deleteOwned: async () => { throw new Error('IO Error'); },
      cleanupOrphans: async () => 0,
    };

    await expect(purgeScanTrash('owned1', { db, photoStore: mockStore })).rejects.toThrow('IO Error');

    // Row is still there
    const photo = db.get('SELECT * FROM scan WHERE uuid = ?', ['owned1']);
    expect(photo).not.toBeUndefined();
  });
});

describe('cleanupOrphanPhotos', () => {
  test('passes referenced owned URIs to store cleanup', async () => {
    const db = freshDb();
    insertScan(db, sampleScan({ uuid: 'owned1', imageUri: 'file:///app/photos/1.jpg', isOwnedPhoto: true }));
    insertScan(db, sampleScan({ uuid: 'unowned', imageUri: 'file:///cache/2.jpg', isOwnedPhoto: false }));
    softDeleteScan(db, 'owned1', '2026-08-30T10:00:00.000Z');
    // Trashed but still referenced
    insertScan(db, sampleScan({ uuid: 'owned2', imageUri: 'file:///app/photos/3.jpg', isOwnedPhoto: true }));

    let passedRefs = new Set<string>();
    const mockStore: PhotoStore = {
      copyToOwned: async () => '',
      deleteOwned: async () => {},
      cleanupOrphans: async (refs) => { passedRefs = refs; return 2; },
    };

    const deleted = await cleanupOrphanPhotos(db, mockStore);
    
    expect(deleted).toBe(2);
    expect(passedRefs.has('file:///app/photos/1.jpg')).toBe(true);
    expect(passedRefs.has('file:///app/photos/3.jpg')).toBe(true);
    expect(passedRefs.has('file:///cache/2.jpg')).toBe(false); // only isOwnedPhoto = 1
  });
});
