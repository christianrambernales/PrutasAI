/**
 * Opt-in, hits the real APIs: RUN_LIVE_GEO=1 npx jest geocoding.live
 * Mocks agreeing with themselves is how a dead Gemini model shipped once.
 */
import { reverseGeocode, searchPlaces } from '../geocoding';

const live = process.env.RUN_LIVE_GEO === '1' ? describe : describe.skip;

live('geocoding, live', () => {
  jest.setTimeout(30000);

  test('finds a Philippine municipality', async () => {
    const places = await searchPlaces('Bacoor');
    expect(places.length).toBeGreaterThan(0);
    expect(places[0].country).toBe('Philippines');
  });

  test('works outside the Philippines', async () => {
    const places = await searchPlaces('Nairobi');
    expect(places[0].country).toBe('Kenya');
  });

  test('names a coordinate', async () => {
    const place = await reverseGeocode({ latitude: 14.459, longitude: 120.9385 });
    expect(place?.label).toContain('Bacoor');
  });
});
