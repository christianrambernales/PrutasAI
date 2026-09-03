/**
 * Place lookup. Two keyless services: Open-Meteo geocoding for search (it has
 * no reverse endpoint) and BigDataCloud for reverse. Neither needs an account,
 * so this works in a fresh checkout and ships no credential.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place extends Coordinates {
  label: string;
  region: string;
  country: string;
  elevationM: number | null;
}

export interface GeoOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

/** ~1.1 km. The app never stores a precise fix. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function label(name: string, region: string): string {
  return region ? `${name}, ${region}` : name;
}

async function getJson(url: string, options: GeoOptions): Promise<unknown> {
  const { fetchImpl = fetch, signal } = options;
  const response = await fetchImpl(url, { signal });
  if (!response.ok) throw new Error(`Geocoding returned ${response.status}`);
  return response.json();
}

interface SearchResult {
  name?: string; latitude?: number; longitude?: number; elevation?: number;
  country?: string; admin1?: string;
}

export async function searchPlaces(query: string, options: GeoOptions = {}): Promise<Place[]> {
  const q = query.trim();
  if (q === '') return [];

  const params = new URLSearchParams({ name: q, count: '10', language: 'en', format: 'json' });
  const body = (await getJson(`${SEARCH_URL}?${params}`, options)) as { results?: SearchResult[] };

  return (body.results ?? [])
    .filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number')
    .map(r => ({
      label: label(r.name ?? '', r.admin1 ?? ''),
      latitude: roundCoordinate(r.latitude as number),
      longitude: roundCoordinate(r.longitude as number),
      region: r.admin1 ?? '',
      country: r.country ?? '',
      elevationM: typeof r.elevation === 'number' ? Math.round(r.elevation) : null,
    }));
}

export async function reverseGeocode(
  coords: Coordinates,
  options: GeoOptions = {},
): Promise<Place | null> {
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    localityLanguage: 'en',
  });

  const body = (await getJson(`${REVERSE_URL}?${params}`, options)) as {
    city?: string; locality?: string; countryName?: string; principalSubdivision?: string;
  };

  const name = body.city || body.locality;
  if (!name) return null;

  // "Calabarzon (Region IV-A)" reads better without the parenthetical.
  const region = (body.principalSubdivision ?? '').replace(/\s*\(.*\)$/, '');
  // BigDataCloud returns "Philippines (the)".
  const country = (body.countryName ?? '').replace(/\s*\(the\)$/, '');

  return {
    label: label(name, region),
    latitude: roundCoordinate(coords.latitude),
    longitude: roundCoordinate(coords.longitude),
    region,
    country,
    elevationM: null,
  };
}
