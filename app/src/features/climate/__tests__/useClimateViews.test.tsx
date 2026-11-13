import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { buildClimateViews, useClimateViews } from '../useClimateViews';
import type { FruitSummary } from '../../viewModels';
import type { SqlDriver } from '../../../core/db/driver';

const FRUITS: FruitSummary[] = [
  { key: 'mango', emoji: '🥭', nameEn: 'Mango', nameFil: 'Mangga', varietyCount: 3 },
];

const LOCATION = { label: 'Los Baños, Laguna', latitude: 14.17, longitude: 121.24 };

const CURRENT = {
  temperatureC: 26.4, apparentTemperatureC: 29.1, humidityPct: 81.2,
  precipitationMm: 2, condition: 'Partly cloudy', elevationM: 29,
};

const READY = { current: CURRENT, normals: null, status: 'ready', fetchedAt: Date.now() };

test('no snapshot without a saved location, however good the reading', () => {
  const views = buildClimateViews({ climate: READY as never, savedLocation: null, fruits: FRUITS });
  expect(views.snapshot).toBeNull();
  expect(views.savedLocationLabel).toBe('No location saved');
});

test('a snapshot rounds the reading and labels the coordinates', () => {
  const views = buildClimateViews({ climate: READY as never, savedLocation: LOCATION, fruits: FRUITS });
  expect(views.snapshot).not.toBeNull();
  expect(views.snapshot!.place).toBe('Los Baños, Laguna');
  expect(views.snapshot!.temperatureC).toBe(26);
  expect(views.snapshot!.humidityPct).toBe(81);
  expect(views.snapshot!.coordsLabel).toContain('14.17, 121.24');
  expect(views.snapshot!.freshness).toBe('live');
});

test('an errored fetch is shown as stale rather than hidden', () => {
  const errored = { ...READY, status: 'error' };
  const views = buildClimateViews({ climate: errored as never, savedLocation: LOCATION, fruits: FRUITS });
  expect(views.snapshot!.freshness).toBe('stale');
  expect(views.snapshot!.freshnessLabel).toMatch(/^Stale/);
});

test('a fruit with no requirement row gets an explicit not-enough-data outcome', () => {
  const views = buildClimateViews({ climate: READY as never, savedLocation: LOCATION, fruits: FRUITS });
  expect(views.suitabilityFor('not-a-fruit')?.verdict).toBe('insufficient_data');
});

test('no historical evidence yields an explicit not-enough-data view for a known crop', () => {
  const views = buildClimateViews({ climate: READY as never, savedLocation: LOCATION, fruits: FRUITS });
  const suitability = views.suitabilityFor('mango');
  expect(suitability?.verdict).toBe('insufficient_data');
  expect(suitability?.headline).toBe('Not enough data');
});

test('five-year historical provenance and present-weather provenance have separate timestamps', () => {
  const historicalFetchedAt = Date.parse('2026-09-01T12:00:00.000Z');
  const currentFetchedAt = Date.parse('2026-09-24T12:00:00.000Z');
  const climate = {
    status: 'ready', normals: {
      monthlyRainMm: Array(12).fill(200), annualRainMm: 2400, meanTemperatureC: 27,
      fromYear: 2021, toYear: 2025,
    }, currentFetchedAt, historicalFetchedAt,
    historicalSource: 'ERA5', historicalPeriod: { fromYear: 2021, toYear: 2025 },
    current: CURRENT,
  };
  const views = buildClimateViews({ climate: climate as never, savedLocation: LOCATION, fruits: FRUITS });
  const suitability = views.suitabilityFor('mango');
  expect(suitability?.evidenceFetchedAt).toBe(historicalFetchedAt);
  expect(suitability?.provisional).toBe(true);
  expect(suitability?.sourceLabel).toContain('ERA5');
  expect(suitability?.evidenceStatus).toBe('live');
  expect(suitability?.evidenceAgeMs).toBeGreaterThanOrEqual(0);
  expect(views.snapshot?.fetchedAt).toBe(currentFetchedAt);
  expect(suitability?.evidenceFetchedAt).not.toBe(views.snapshot?.fetchedAt);
});

test('changing the saved location never reuses the previous location current or archive evidence', () => {
  const otherLocation = { label: 'Davao', latitude: 7.07, longitude: 125.61 };
  const prior = {
    ...READY,
    locationKey: '14.17,121.24',
    current: CURRENT,
    normals: {
      monthlyRainMm: Array(12).fill(200), annualRainMm: 2400, meanTemperatureC: 27,
      fromYear: 2021, toYear: 2025,
    },
    currentFetchedAt: Date.now(),
    historicalFetchedAt: Date.now(),
  };
  const views = buildClimateViews({ climate: prior as never, savedLocation: otherLocation, fruits: FRUITS });
  expect(views.snapshot).toBeNull();
  expect(views.suitabilityFor('mango')?.verdict).toBe('insufficient_data');
  expect(views.suitabilityFor('mango')?.evidenceFetchedAt).toBeNull();
});

test('the hook exposes exactly the documented shape', () => {
  let value!: ReturnType<typeof useClimateViews>;
  function Host() {
    value = useClimateViews({ savedLocation: null, fruits: FRUITS, db: {} as SqlDriver });
    return null;
  }
  act(() => { renderer.create(<Host />); });
  expect(Object.keys(value).sort()).toEqual(
    ['climate', 'normals', 'savedLocationLabel', 'snapshot', 'suitabilityFor'],
  );
});
