import { reverseGeocode, roundCoordinate, searchPlaces } from '../geocoding';

const SEARCH_BODY = {
  results: [{
    name: 'Bacoor', latitude: 14.45896, longitude: 120.93851, elevation: 5,
    country: 'Philippines', admin1: 'Calabarzon',
  }],
};

const REVERSE_BODY = {
  latitude: 14.459, longitude: 120.9385, city: 'Bacoor',
  countryName: 'Philippines (the)', principalSubdivision: 'Calabarzon (Region IV-A)',
};

const ok = (body: unknown) => (async () => ({ ok: true, status: 200, json: async () => body })) as unknown as typeof fetch;

test('coordinates are rounded to two decimals', () => {
  expect(roundCoordinate(14.45896)).toBe(14.46);
  expect(roundCoordinate(-1.28333)).toBe(-1.28);
});

test('search returns places with a readable label', async () => {
  const places = await searchPlaces('Bacoor', { fetchImpl: ok(SEARCH_BODY) });
  expect(places[0].label).toBe('Bacoor, Calabarzon');
  expect(places[0].latitude).toBe(14.46);
  expect(places[0].country).toBe('Philippines');
});

test('search sends no API key', async () => {
  let url = '';
  await searchPlaces('Bacoor', {
    fetchImpl: (async (u: string) => { url = u; return { ok: true, status: 200, json: async () => SEARCH_BODY }; }) as unknown as typeof fetch,
  });
  expect(url.toLowerCase()).not.toContain('key=');
  expect(url).toContain('name=Bacoor');
});

test('an empty query does not call the network', async () => {
  let called = false;
  const places = await searchPlaces('  ', {
    fetchImpl: (async () => { called = true; throw new Error('no'); }) as unknown as typeof fetch,
  });
  expect(places).toEqual([]);
  expect(called).toBe(false);
});

test('no results is an empty list, not an error', async () => {
  await expect(searchPlaces('zzzz', { fetchImpl: ok({}) })).resolves.toEqual([]);
});

test('an HTTP error is raised rather than returning nothing', async () => {
  await expect(
    searchPlaces('Bacoor', { fetchImpl: (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch }),
  ).rejects.toThrow(/503/);
});

test('reverse geocoding names a coordinate', async () => {
  const place = await reverseGeocode({ latitude: 14.459, longitude: 120.9385 }, { fetchImpl: ok(REVERSE_BODY) });
  expect(place?.label).toBe('Bacoor, Calabarzon');
});

test('reverse geocoding returns null rather than throwing when it cannot name a place', async () => {
  await expect(
    reverseGeocode({ latitude: 0, longitude: 0 }, { fetchImpl: ok({}) }),
  ).resolves.toBeNull();
});
