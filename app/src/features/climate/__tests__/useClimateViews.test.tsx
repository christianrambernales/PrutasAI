import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { buildClimateViews, useClimateViews } from '../useClimateViews';
import type { FruitSummary } from '../../viewModels';

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

test('suitability is null when the fruit has no requirement row', () => {
  const views = buildClimateViews({ climate: READY as never, savedLocation: LOCATION, fruits: FRUITS });
  expect(views.suitabilityFor('not-a-fruit')).toBeNull();
});

test('the hook exposes exactly the documented shape', () => {
  let value!: ReturnType<typeof useClimateViews>;
  function Host() {
    value = useClimateViews({ savedLocation: null, fruits: FRUITS });
    return null;
  }
  act(() => { renderer.create(<Host />); });
  expect(Object.keys(value).sort()).toEqual(
    ['climate', 'normals', 'savedLocationLabel', 'snapshot', 'suitabilityFor'],
  );
});
