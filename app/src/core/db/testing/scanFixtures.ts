import { createTestDriver } from './betterSqliteDriver';
import { migrate } from '../migrate';
import { seedContent } from '../seed';
import seedSql from '../seed.sql';
import { CONTENT_VERSION } from '../appDatabase';
import type { SqlDriver } from '../driver';
import type { NewScan } from '../repositories/scans';

/** A migrated, empty database. */
export function freshDb(): SqlDriver {
  const driver = createTestDriver();
  migrate(driver);
  return driver;
}

/** A database carrying the bundled fruit and variety rows, as the app's does. */
export function seededDb(): SqlDriver {
  const driver = freshDb();
  seedContent(driver, seedSql, CONTENT_VERSION);
  return driver;
}

/** A scan with nothing inferred, overridable field by field. */
export function sampleScan(overrides: Partial<NewScan> = {}): NewScan {
  return {
    uuid: 'a1',
    imageUri: 'file:///photo.jpg',
    createdAt: '2026-08-11T10:00:00.000Z',
    fruitKey: null,
    fruitConf: null,
    varietyKey: null,
    varietyConf: null,
    bboxJson: null,
    manifestVersion: 1,
    lat: null,
    lon: null,
    ...overrides,
  };
}
