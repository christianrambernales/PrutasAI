import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { createTestDriver } from '../../../core/db/testing/betterSqliteDriver';
import { migrate } from '../../../core/db/migrate';
import { getHistoricalClimateCache, saveHistoricalClimateCache } from '../../../core/db/repositories/climate';
import { useClimate } from '../useClimate';
import { fetchCurrentWeather, fetchNormals } from '../../../core/climate/openMeteo';
import type { ClimateData } from '../useClimate';

jest.mock('../../../core/climate/openMeteo', () => ({
  fetchCurrentWeather: jest.fn(),
  fetchNormals: jest.fn(),
}));

const LOCATION = { label: 'Los Baños', latitude: 14.17, longitude: 121.24 };
const HISTORICAL = {
  monthlyRainMm: Array(12).fill(200), annualRainMm: 2400, meanTemperatureC: 27,
  fromYear: 2021, toYear: 2025,
};

beforeEach(() => jest.resetAllMocks());

test('offline cold start reuses cached historical inputs while tracking current and historical outcomes separately', async () => {
  const db = createTestDriver();
  migrate(db);
  const savedAt = Date.parse('2026-09-01T12:00:00.000Z');
  saveHistoricalClimateCache(db, LOCATION, HISTORICAL, savedAt, 'Open-Meteo Best Match (reanalysis)', 21);
  (fetchCurrentWeather as jest.Mock).mockRejectedValue(new Error('offline'));
  (fetchNormals as jest.Mock).mockRejectedValue(new Error('offline'));

  let data!: ClimateData;
  function Host() {
    data = useClimate(LOCATION, db);
    return null;
  }

  await act(async () => {
    renderer.create(<Host />);
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(data.status).toBe('ready');
  expect(data.currentStatus).toBe('error');
  expect(data.currentFetchedAt).toBeNull();
  expect(data.historicalStatus).toBe('stale');
  expect(data.normals).toEqual(HISTORICAL);
  expect(data.historicalFetchedAt).toBe(savedAt);
  expect(data.historicalElevationM).toBe(21);
  expect(data.historicalSource).toContain('Best Match');
});

test('partial endpoint success keeps its data even when the other endpoint fails', async () => {
  const db = createTestDriver();
  migrate(db);
  (fetchCurrentWeather as jest.Mock).mockResolvedValue({
    temperatureC: 27, apparentTemperatureC: 28, humidityPct: 70, precipitationMm: 0,
    weatherCode: 1, condition: 'Mainly clear', elevationM: 21, observedAt: '2026-09-24T12:00',
  });
  (fetchNormals as jest.Mock).mockRejectedValue(new Error('archive unavailable'));

  let data!: ClimateData;
  function Host() {
    data = useClimate(LOCATION, db);
    return null;
  }
  await act(async () => {
    renderer.create(<Host />);
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(data.status).toBe('ready');
  expect(data.currentStatus).toBe('ready');
  expect(data.currentFetchedAt).toBeGreaterThan(0);
  expect(data.historicalStatus).toBe('error');
  expect(data.normals).toBeNull();
});

test('elevation fetched before archive completion is retained in the cache for an offline remount', async () => {
  const db = createTestDriver();
  migrate(db);
  let resolveNormals!: (value: typeof HISTORICAL) => void;
  (fetchCurrentWeather as jest.Mock).mockResolvedValue({
    temperatureC: 27, apparentTemperatureC: 28, humidityPct: 70, precipitationMm: 0,
    weatherCode: 1, condition: 'Mainly clear', elevationM: 21, observedAt: '2026-09-24T12:00',
  });
  (fetchNormals as jest.Mock).mockImplementation(() => new Promise(resolve => { resolveNormals = resolve; }));

  let data!: ClimateData;
  function Host() {
    data = useClimate(LOCATION, db);
    return null;
  }
  let mounted!: ReturnType<typeof renderer.create>;
  await act(async () => { mounted = renderer.create(<Host />); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(data.historicalElevationM).toBe(21);

  await act(async () => {
    resolveNormals(HISTORICAL);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(data.historicalElevationM).toBe(21);
  expect(getHistoricalClimateCache(db, LOCATION)?.elevationM).toBe(21);
  await act(async () => { mounted.unmount(); });

  (fetchCurrentWeather as jest.Mock).mockRejectedValue(new Error('offline'));
  (fetchNormals as jest.Mock).mockRejectedValue(new Error('offline'));
  await act(async () => { mounted = renderer.create(<Host />); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(data.historicalElevationM).toBe(21);
  expect(data.historicalStatus).toBe('stale');
  await act(async () => { mounted.unmount(); });
});

test('elevation fetched after archive completion updates the existing cache row', async () => {
  const db = createTestDriver();
  migrate(db);
  let resolveWeather!: (value: NonNullable<ClimateData['current']>) => void;
  let resolveNormals!: (value: typeof HISTORICAL) => void;
  (fetchCurrentWeather as jest.Mock).mockImplementation(() => new Promise(resolve => { resolveWeather = resolve; }));
  (fetchNormals as jest.Mock).mockImplementation(() => new Promise(resolve => { resolveNormals = resolve; }));

  let data!: ClimateData;
  function Host() {
    data = useClimate(LOCATION, db);
    return null;
  }
  let mounted!: ReturnType<typeof renderer.create>;
  await act(async () => { mounted = renderer.create(<Host />); });
  await act(async () => {
    resolveNormals(HISTORICAL);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(getHistoricalClimateCache(db, LOCATION)?.elevationM).toBeNull();

  await act(async () => {
    resolveWeather({
      temperatureC: 27, apparentTemperatureC: 28, humidityPct: 70, precipitationMm: 0,
      weatherCode: 1, condition: 'Mainly clear', elevationM: 21, observedAt: '2026-09-24T12:00',
    });
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(getHistoricalClimateCache(db, LOCATION)?.elevationM).toBe(21);
  expect(data.historicalElevationM).toBe(21);
  await act(async () => { mounted.unmount(); });
});
