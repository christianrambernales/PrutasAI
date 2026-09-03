/**
 * Open-Meteo client — the app's only network dependency besides the optional
 * assistant rewording.
 *
 * Chosen because it needs no API key and no account, which keeps the climate
 * feature working in a fresh checkout and keeps a credential out of the APK.
 * Data is CC BY 4.0 and must stay attributed on screen.
 *
 * Two distinct things come from here, and the design spec is emphatic that they
 * are never mixed:
 *   - **current conditions**, shown for context only;
 *   - **normals**, multi-year monthly means, which are the *only* input to a
 *     suitability verdict. Today's weather never decides whether a fruit grows.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CurrentWeather {
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  weatherCode: number;
  condition: string;
  elevationM: number;
  /** Open-Meteo's own observation time, not the device clock. */
  observedAt: string;
}

export interface ClimateNormalsData {
  /** Twelve monthly rainfall means, January first, in millimetres. */
  monthlyRainMm: number[];
  annualRainMm: number;
  meanTemperatureC: number;
  fromYear: number;
  toYear: number;
}

export interface DailyArchive {
  time: string[];
  precipitation_sum: (number | null)[];
  temperature_2m_mean: (number | null)[];
}

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

/** WMO 4677 weather codes, grouped to the distinctions a grower cares about. */
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

export function describeWeatherCode(code: number): string {
  return WEATHER_CODES[code] ?? 'Unknown';
}

function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

interface FetchOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

async function getJson(url: string, options: FetchOptions): Promise<unknown> {
  const { fetchImpl = fetch, signal } = options;
  const response = await fetchImpl(url, { signal });
  if (!response.ok) {
    throw new Error(`Open-Meteo returned ${response.status}`);
  }
  return response.json();
}

export async function fetchCurrentWeather(
  coords: Coordinates,
  options: FetchOptions = {},
): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code',
    timezone: 'auto',
  });

  const body = (await getJson(`${FORECAST_URL}?${params}`, options)) as {
    elevation?: number;
    current?: Record<string, number | string>;
  };

  const current = body?.current;
  // Refuse rather than default: a zeroed reading would be indistinguishable
  // from a real one at 0 °C.
  if (!current || typeof current.temperature_2m !== 'number') {
    throw new Error('Open-Meteo response carried no current conditions');
  }

  const weatherCode = Number(current.weather_code ?? -1);

  return {
    temperatureC: Number(current.temperature_2m),
    apparentTemperatureC: Number(current.apparent_temperature ?? current.temperature_2m),
    humidityPct: Number(current.relative_humidity_2m ?? 0),
    precipitationMm: Number(current.precipitation ?? 0),
    weatherCode,
    condition: describeWeatherCode(weatherCode),
    elevationM: Math.round(Number(body.elevation ?? 0)),
    observedAt: String(current.time ?? ''),
  };
}

/**
 * Averages each calendar month across whole years.
 *
 * Rainfall is a *total per month* averaged across years — summing the daily
 * values inside each month first, then averaging those sums, so a month
 * observed in five years is not five times wetter than one observed in one.
 */
export function computeNormals(daily: DailyArchive): ClimateNormalsData {
  // month index -> year -> running total
  const rainByMonthYear: Map<number, Map<number, number>> = new Map();
  let tempTotal = 0;
  let tempCount = 0;
  let minYear = Infinity;
  let maxYear = -Infinity;

  daily.time.forEach((iso, i) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return;
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    minYear = Math.min(minYear, year);
    maxYear = Math.max(maxYear, year);

    const rain = daily.precipitation_sum?.[i];
    if (typeof rain === 'number' && Number.isFinite(rain)) {
      if (!rainByMonthYear.has(month)) rainByMonthYear.set(month, new Map());
      const years = rainByMonthYear.get(month)!;
      years.set(year, (years.get(year) ?? 0) + rain);
    }

    const temp = daily.temperature_2m_mean?.[i];
    if (typeof temp === 'number' && Number.isFinite(temp)) {
      tempTotal += temp;
      tempCount += 1;
    }
  });

  const monthlyRainMm = Array.from({ length: 12 }, (_, month) => {
    const years = rainByMonthYear.get(month);
    if (!years || years.size === 0) return 0;
    const total = [...years.values()].reduce((a, b) => a + b, 0);
    return round(total / years.size);
  });

  return {
    monthlyRainMm,
    annualRainMm: round(monthlyRainMm.reduce((a, b) => a + b, 0)),
    meanTemperatureC: tempCount === 0 ? 0 : round(tempTotal / tempCount),
    fromYear: Number.isFinite(minYear) ? minYear : 0,
    toYear: Number.isFinite(maxYear) ? maxYear : 0,
  };
}

export interface NormalsOptions extends FetchOptions {
  years?: number;
  /** Injectable so the requested window is deterministic in tests. */
  today?: Date;
}

export async function fetchNormals(
  coords: Coordinates,
  options: NormalsOptions = {},
): Promise<ClimateNormalsData> {
  const { years = 5, today = new Date() } = options;

  // Whole calendar years only, ending with the last complete one — a part-year
  // would weight the months it covers and skew every monthly mean.
  const lastComplete = today.getUTCFullYear() - 1;
  const firstYear = lastComplete - years + 1;

  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    start_date: `${firstYear}-01-01`,
    end_date: `${lastComplete}-12-31`,
    daily: 'precipitation_sum,temperature_2m_mean',
    timezone: 'auto',
  });

  const body = (await getJson(`${ARCHIVE_URL}?${params}`, options)) as { daily?: DailyArchive };
  if (!body?.daily?.time) {
    throw new Error('Open-Meteo archive carried no daily series');
  }

  return computeNormals(body.daily);
}
