import {
  computeNormals,
  describeWeatherCode,
  fetchCurrentWeather,
  fetchNormals,
} from '../openMeteo';

const COORDS = { latitude: 14.17, longitude: 121.24 };

// Shape copied from a live api.open-meteo.com/v1/forecast response.
const CURRENT_BODY = {
  latitude: 14.165202,
  longitude: 121.24654,
  timezone: 'Asia/Manila',
  elevation: 29.0,
  current: {
    time: '2026-08-11T10:30',
    temperature_2m: 29.7,
    relative_humidity_2m: 74,
    apparent_temperature: 35.1,
    precipitation: 2.5,
    weather_code: 2,
  },
};

function jsonResponse(body: unknown) {
  return async () => ({ ok: true, status: 200, json: async () => body });
}

// --- weather codes ----------------------------------------------------------

test('WMO weather codes become readable conditions', () => {
  expect(describeWeatherCode(0)).toBe('Clear sky');
  expect(describeWeatherCode(2)).toBe('Partly cloudy');
  expect(describeWeatherCode(61)).toBe('Slight rain');
  expect(describeWeatherCode(95)).toBe('Thunderstorm');
});

test('an unknown weather code does not crash or invent a condition', () => {
  expect(describeWeatherCode(999)).toBe('Unknown');
});

// --- current conditions -----------------------------------------------------

test('current weather is read from the live response', async () => {
  const weather = await fetchCurrentWeather(COORDS, {
    fetchImpl: jsonResponse(CURRENT_BODY) as unknown as typeof fetch,
  });

  expect(weather.temperatureC).toBe(29.7);
  expect(weather.humidityPct).toBe(74);
  expect(weather.apparentTemperatureC).toBe(35.1);
  expect(weather.precipitationMm).toBe(2.5);
  expect(weather.elevationM).toBe(29);
  expect(weather.condition).toBe('Partly cloudy');
});

test('the request carries the coordinates and needs no API key', async () => {
  let url = '';
  await fetchCurrentWeather(COORDS, {
    fetchImpl: (async (u: string) => {
      url = u;
      return { ok: true, status: 200, json: async () => CURRENT_BODY };
    }) as unknown as typeof fetch,
  });

  expect(url).toContain('latitude=14.17');
  expect(url).toContain('longitude=121.24');
  expect(url.toLowerCase()).not.toContain('key=');
  expect(url.toLowerCase()).not.toContain('token');
});

test('an HTTP error is raised rather than returning invented weather', async () => {
  await expect(
    fetchCurrentWeather(COORDS, {
      fetchImpl: (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch,
    }),
  ).rejects.toThrow(/503/);
});

test('a response missing the current block is rejected, not defaulted to zero', async () => {
  await expect(
    fetchCurrentWeather(COORDS, {
      fetchImpl: jsonResponse({ elevation: 29 }) as unknown as typeof fetch,
    }),
  ).rejects.toThrow();
});

// --- normals ----------------------------------------------------------------

test('monthly normals average each calendar month across the years supplied', () => {
  // Two Januaries: 10mm total and 20mm total → normal of 15mm.
  const normals = computeNormals({
    time: ['2020-01-01', '2020-01-02', '2021-01-01', '2021-01-02'],
    precipitation_sum: [4, 6, 8, 12],
    temperature_2m_mean: [25, 25, 27, 27],
  });

  expect(normals.monthlyRainMm[0]).toBe(15);
  expect(normals.meanTemperatureC).toBe(26);
});

test('months with no data report zero rather than NaN', () => {
  const normals = computeNormals({
    time: ['2020-01-01'],
    precipitation_sum: [5],
    temperature_2m_mean: [25],
  });

  expect(normals.monthlyRainMm).toHaveLength(12);
  expect(normals.monthlyRainMm.every(v => Number.isFinite(v))).toBe(true);
  expect(normals.monthlyRainMm[5]).toBe(0);
});

test('the annual total is the sum of the twelve monthly normals', () => {
  const normals = computeNormals({
    time: ['2020-01-15', '2020-02-15', '2020-03-15'],
    precipitation_sum: [10, 20, 30],
    temperature_2m_mean: [26, 27, 28],
  });

  expect(normals.annualRainMm).toBe(60);
});

test('null readings in the archive are skipped, not counted as zero', () => {
  const normals = computeNormals({
    time: ['2020-01-01', '2020-01-02'],
    precipitation_sum: [10, null],
    temperature_2m_mean: [26, null],
  });

  expect(normals.monthlyRainMm[0]).toBe(10);
  expect(normals.meanTemperatureC).toBe(26);
});

test('normals are fetched from the archive endpoint over whole years', async () => {
  let url = '';
  await fetchNormals(COORDS, {
    years: 5,
    today: new Date('2026-08-11T00:00:00Z'),
    fetchImpl: (async (u: string) => {
      url = u;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          daily: { time: ['2021-01-01'], precipitation_sum: [4], temperature_2m_mean: [25] },
        }),
      };
    }) as unknown as typeof fetch,
  });

  expect(url).toContain('archive-api.open-meteo.com');
  // Whole calendar years only: a part-year would skew the monthly means.
  expect(url).toContain('start_date=2021-01-01');
  expect(url).toContain('end_date=2025-12-31');
});

test('normals report the period the returned data actually covers', async () => {
  const normals = await fetchNormals(COORDS, {
    years: 5,
    today: new Date('2026-08-11T00:00:00Z'),
    fetchImpl: (async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        daily: {
          time: ['2021-06-01', '2023-06-01', '2025-06-01'],
          precipitation_sum: [12, 14, 16],
          temperature_2m_mean: [27, 27, 27],
        },
      }),
    })) as unknown as typeof fetch,
  });

  expect(normals.fromYear).toBe(2021);
  expect(normals.toYear).toBe(2025);
});

test('a short archive reports the narrower period rather than overstating coverage', async () => {
  const normals = await fetchNormals(COORDS, {
    years: 5,
    today: new Date('2026-08-11T00:00:00Z'),
    fetchImpl: (async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        daily: { time: ['2024-06-01'], precipitation_sum: [12], temperature_2m_mean: [27] },
      }),
    })) as unknown as typeof fetch,
  });

  // The window asked for five years; only one came back, and the label must say so.
  expect(normals.fromYear).toBe(2024);
  expect(normals.toYear).toBe(2024);
});
