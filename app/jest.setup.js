// Safe-area insets have no meaning in a test renderer; the library's own mock
// reports zeros so screens lay out deterministically. It ships as a default
// export, so the namespace object alone would carry none of the hooks.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// A granted camera whose shutter returns a fixed URI, so the capture path can be
// exercised without hardware. Tests that need the denied path override this.
jest.mock('expo-camera', () => {
  const React = require('react');
  return {
    CameraView: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: async () => ({ uri: 'file:///test/photo.jpg', width: 4, height: 3 }),
      }));
      return React.createElement('CameraView', props);
    }),
    useCameraPermissions: () => [
      { granted: true, canAskAgain: true, status: 'granted' },
      jest.fn(),
    ],
  };
});

// Cancelling is the default so a stray press cannot silently navigate.
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
  launchImageLibraryAsync: async () => ({ canceled: true, assets: [] }),
}));

// The app-level tests render the navigator, which opens a database. Back it
// with the same in-memory better-sqlite3 the db tests use, so the navigator
// exercises real SQL rather than a stub.
//
// One connection per filename, kept for the file: a test seeds the database
// first and the navigator then opens that same one. `__resetDatabases` drops
// them so scans cannot leak from one test into the next.
jest.mock('expo-sqlite', () => {
  const open = new Map();

  return {
    openDatabaseSync: (name) => {
      const Database = require('better-sqlite3');
      if (!open.has(name)) open.set(name, new Database(':memory:'));
      const db = open.get(name);
      return {
        execSync: (sql) => db.exec(sql),
        getAllSync: (sql, params = []) => db.prepare(sql).all(...params),
        getFirstSync: (sql, params = []) => db.prepare(sql).get(...params) ?? null,
      };
    },
    __resetDatabases: () => open.clear(),
  };
});

// Granted coarse location by default; tests override per case.
jest.mock('expo-location', () => ({
  Accuracy: { Low: 1, Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 14.45896, longitude: 120.93851 } })),
}));
