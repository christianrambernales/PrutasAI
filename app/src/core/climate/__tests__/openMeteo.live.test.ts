/**
 * Opt-in integration test against the real Open-Meteo API.
 *
 * Skipped by default so the suite stays offline and deterministic. Run with:
 *   RUN_LIVE_CLIMATE=1 npx jest openMeteo.live
 *
 * It exists because the previous round shipped a Gemini model that every unit
 * test accepted — the mocks agreed with themselves while the live endpoint
 * answered 404 on every call. Response shapes are worth checking against the
 * real thing at least once.
 */

import { fetchCurrentWeather, fetchNormals } from '../openMeteo';

const live = process.env.RUN_LIVE_CLIMATE === '1' ? describe : describe.skip;

// Los Baños, Laguna — a wet tropical lowland site with well-known values.
const COORDS = { latitude: 14.17, longitude: 121.24 };

live('Open-Meteo, live', () => {
  jest.setTimeout(30000);

  test('current conditions parse and are physically plausible', async () => {
    const weather = await fetchCurrentWeather(COORDS);

    expect(weather.temperatureC).toBeGreaterThan(10);
    expect(weather.temperatureC).toBeLessThan(45);
    expect(weather.humidityPct).toBeGreaterThanOrEqual(0);
    expect(weather.humidityPct).toBeLessThanOrEqual(100);
    expect(weather.elevationM).toBeGreaterThanOrEqual(0);
    expect(weather.condition).not.toBe('Unknown');
    expect(weather.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('normals parse and match the known tropical-lowland climate', async () => {
    const normals = await fetchNormals(COORDS, { years: 5 });

    expect(normals.monthlyRainMm).toHaveLength(12);
    expect(normals.monthlyRainMm.every(Number.isFinite)).toBe(true);

    // Los Baños sits around 2,000–3,000 mm a year and 25–29 °C.
    expect(normals.annualRainMm).toBeGreaterThan(1200);
    expect(normals.annualRainMm).toBeLessThan(5000);
    expect(normals.meanTemperatureC).toBeGreaterThan(22);
    expect(normals.meanTemperatureC).toBeLessThan(32);

    // A monsoon climate: the wettest month must clearly beat the driest.
    const wettest = Math.max(...normals.monthlyRainMm);
    const driest = Math.min(...normals.monthlyRainMm);
    expect(wettest).toBeGreaterThan(driest * 2);

    expect(normals.toYear - normals.fromYear).toBe(4);
  });
});
