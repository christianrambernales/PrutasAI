import { createTestDriver } from '../../testing/betterSqliteDriver';
import { migrate } from '../../migrate';
import { getHistoricalClimateCache, saveHistoricalClimateCache } from '../climate';

const COORDS = { latitude: 14.174, longitude: 121.244 };
const NORMALS = {
  monthlyRainMm: [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210],
  annualRainMm: 1860,
  meanTemperatureC: 27,
  fromYear: 2021,
  toYear: 2025,
};

function freshDb() {
  const db = createTestDriver();
  migrate(db);
  return db;
}

test('historical evidence survives a new repository read with original provenance and site elevation', () => {
  const db = freshDb();
  const fetchedAt = Date.parse('2026-09-01T10:00:00.000Z');
  expect(saveHistoricalClimateCache(db, COORDS, NORMALS, fetchedAt, 'Open-Meteo Best Match (reanalysis)', 21)).toBe(true);

  // A fresh read after remount/restart uses only SQLite state.
  const cached = getHistoricalClimateCache(db, { latitude: 14.17, longitude: 121.24 });
  expect(cached).toEqual({
    latitude: 14.17,
    longitude: 121.24,
    normals: NORMALS,
    sourceModel: 'Open-Meteo Best Match (reanalysis)',
    fetchedAt,
    elevationM: 21,
  });
});

test('cache lookup rounds coordinates and never returns another location evidence', () => {
  const db = freshDb();
  saveHistoricalClimateCache(db, COORDS, NORMALS, Date.now());
  expect(getHistoricalClimateCache(db, { latitude: 14.18, longitude: 121.24 })).toBeNull();
});

test('invalid historical inputs are rejected rather than persisted', () => {
  const db = freshDb();
  expect(saveHistoricalClimateCache(db, COORDS, { ...NORMALS, monthlyRainMm: [1] })).toBe(false);
  expect(saveHistoricalClimateCache(db, COORDS, { ...NORMALS, meanTemperatureC: Number.NaN })).toBe(false);
  expect(getHistoricalClimateCache(db, COORDS)).toBeNull();
});

test('corrupted cached JSON is removed and exposed as unavailable', () => {
  const db = freshDb();
  saveHistoricalClimateCache(db, COORDS, NORMALS, Date.now());
  db.exec("UPDATE climate_history_cache SET monthly_rain_mm = 'broken-json'");

  expect(getHistoricalClimateCache(db, COORDS)).toBeNull();
  expect(db.get('SELECT latitude_key FROM climate_history_cache')).toBeUndefined();
});

test('a corrupt newest row falls back to older validated evidence for the same saved site', () => {
  const db = freshDb();
  const older = { ...NORMALS, fromYear: 2020, toYear: 2024 };
  saveHistoricalClimateCache(db, COORDS, older, Date.parse('2026-08-01T00:00:00.000Z'), 'older source');
  saveHistoricalClimateCache(db, COORDS, NORMALS, Date.parse('2026-09-01T00:00:00.000Z'), 'newer source');
  db.exec("UPDATE climate_history_cache SET monthly_rain_mm = 'broken-json' WHERE source_model = 'newer source'");

  expect(getHistoricalClimateCache(db, COORDS)?.normals).toEqual(older);
  expect(db.get("SELECT source_model FROM climate_history_cache WHERE source_model = 'newer source'")).toBeUndefined();
});
