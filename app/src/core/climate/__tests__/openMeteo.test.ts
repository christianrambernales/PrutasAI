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

function monthlyArchive(years: number[]) {
  const time: string[] = [];
  const precipitation_sum: number[] = [];
  const temperature_2m_mean: number[] = [];
  years.forEach((year, yearIndex) => {
    for (let month = 0; month < 12; month += 1) {
      time.push(`${year}-${String(month + 1).padStart(2, '0')}-01`);
      precipitation_sum.push(yearIndex === 0 && month === 0 ? 10 : yearIndex === 1 && month === 0 ? 20 : 0);
      temperature_2m_mean.push(yearIndex === 0 ? 25 : 27);
    }
  });
  return { time, precipitation_sum, temperature_2m_mean };
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

test('missing elevation stays unknown instead of being fabricated as sea level', async () => {
  const body = { ...CURRENT_BODY } as Record<string, unknown>;
  delete body.elevation;
  const weather = await fetchCurrentWeather(COORDS, {
    fetchImpl: jsonResponse(body) as unknown as typeof fetch,
  });
  expect(weather.elevationM).toBeNull();
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
  const daily = monthlyArchive([2020, 2021]);
  daily.time.splice(1, 0, '2020-01-02', '2021-01-02');
  daily.precipitation_sum.splice(1, 0, 0, 0);
  daily.temperature_2m_mean.splice(1, 0, 25, 27);
  const normals = computeNormals(daily);

  expect(normals.monthlyRainMm[0]).toBe(15);
  expect(normals.meanTemperatureC).toBe(26);
});

test('an archive with missing monthly observations is rejected instead of filled with zero rainfall', () => {
  expect(() => computeNormals({
    time: ['2020-01-01'],
    precipitation_sum: [5],
    temperature_2m_mean: [25],
  })).toThrow(/missing/i);
});

test('the annual total is the sum of the twelve monthly normals', () => {
  const time = Array.from({ length: 12 }, (_, month) => `2020-${String(month + 1).padStart(2, '0')}-15`);
  const normals = computeNormals({
    time,
    precipitation_sum: [10, 20, 30, ...Array(9).fill(0)],
    temperature_2m_mean: Array(12).fill(27),
  });

  expect(normals.annualRainMm).toBe(60);
});

test('null readings in the archive are skipped, not counted as zero', () => {
  const time = [...Array.from({ length: 12 }, (_, month) => `2020-${String(month + 1).padStart(2, '0')}-01`), '2020-01-02'];
  const normals = computeNormals({
    time,
    precipitation_sum: [...[10, ...Array(11).fill(0)], null],
    temperature_2m_mean: [...[26, ...Array(11).fill(20)], null],
  });

  expect(normals.monthlyRainMm[0]).toBe(10);
  expect(normals.meanTemperatureC).toBeCloseTo(20.5);
});

test('an all-null archive is rejected as unavailable historical evidence', () => {
  expect(() => computeNormals({
    time: ['2020-01-01'],
    precipitation_sum: [null],
    temperature_2m_mean: [null],
  })).toThrow(/missing/i);
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
        json: async () => ({ daily: monthlyArchive([2021, 2022, 2023, 2024, 2025]) }),
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
        daily: monthlyArchive([2021, 2023, 2025]),
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
        daily: monthlyArchive([2024]),
      }),
    })) as unknown as typeof fetch,
  });

  // The window asked for five years; only one came back, and the label must say so.
  expect(normals.fromYear).toBe(2024);
  expect(normals.toYear).toBe(2024);
});
