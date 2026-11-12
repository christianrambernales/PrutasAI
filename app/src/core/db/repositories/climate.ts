import type { ClimateNormalsData } from '../../climate/openMeteo';
import type { SqlDriver } from '../driver';

export const CLIMATE_HISTORY_SOURCE = 'Open-Meteo Best Match (reanalysis)';

export interface ClimateCoordinates {
  latitude: number;
  longitude: number;
}

export interface HistoricalClimateCache {
  latitude: number;
  longitude: number;
  normals: ClimateNormalsData;
  sourceModel: string;
  fetchedAt: number;
  elevationM: number | null;
}

interface CacheRow {
  latitude_key: string;
  longitude_key: string;
  from_year: number;
  to_year: number;
  source_model: string;
  fetched_at: string;
  monthly_rain_mm: string;
  annual_rain_mm: number;
  mean_temperature_c: number;
  elevation_m: number | null;
}

export function climateCoordinateKey(coords: ClimateCoordinates): { latitude: string; longitude: string } | null {
  if (!Number.isFinite(coords.latitude) || Math.abs(coords.latitude) > 90
    || !Number.isFinite(coords.longitude) || Math.abs(coords.longitude) > 180) return null;
  return { latitude: coords.latitude.toFixed(2), longitude: coords.longitude.toFixed(2) };
}

function isValidNormals(normals: ClimateNormalsData): boolean {
  return Number.isInteger(normals.fromYear) && normals.fromYear > 0
    && Number.isInteger(normals.toYear) && normals.toYear >= normals.fromYear
    && Number.isFinite(normals.annualRainMm) && normals.annualRainMm >= 0
    && Number.isFinite(normals.meanTemperatureC)
    && Array.isArray(normals.monthlyRainMm) && normals.monthlyRainMm.length === 12
    && normals.monthlyRainMm.every(value => Number.isFinite(value) && value >= 0);
}

function rowToCache(row: CacheRow): HistoricalClimateCache | null {
  const fetchedAt = Date.parse(row.fetched_at);
  let monthlyRainMm: unknown;
  try {
    monthlyRainMm = JSON.parse(row.monthly_rain_mm);
  } catch {
    return null;
  }
  const normals = {
    monthlyRainMm,
    annualRainMm: row.annual_rain_mm,
    meanTemperatureC: row.mean_temperature_c,
    fromYear: row.from_year,
    toYear: row.to_year,
  } as ClimateNormalsData;
  if (!Number.isFinite(fetchedAt) || !row.source_model || !isValidNormals(normals)
    || (row.elevation_m !== null && (!Number.isFinite(row.elevation_m) || row.elevation_m < 0))) return null;
  return {
    latitude: Number(row.latitude_key),
    longitude: Number(row.longitude_key),
    normals,
    sourceModel: row.source_model,
    fetchedAt,
    elevationM: row.elevation_m,
  };
}

export function getHistoricalClimateCache(
  db: SqlDriver,
  coords: ClimateCoordinates,
): HistoricalClimateCache | null {
  const key = climateCoordinateKey(coords);
  if (!key) return null;
  const rows = db.all<CacheRow>(
    `SELECT latitude_key, longitude_key, from_year, to_year, source_model, fetched_at,
            monthly_rain_mm, annual_rain_mm, mean_temperature_c, elevation_m
       FROM climate_history_cache
      WHERE latitude_key = ? AND longitude_key = ?
      ORDER BY fetched_at DESC`,
    [key.latitude, key.longitude],
  );
  for (const row of rows) {
    const cached = rowToCache(row);
    if (cached) return cached;
    db.all(
      `DELETE FROM climate_history_cache
        WHERE latitude_key = ? AND longitude_key = ? AND from_year = ? AND to_year = ? AND source_model = ?
        RETURNING latitude_key`,
      [row.latitude_key, row.longitude_key, row.from_year, row.to_year, row.source_model],
    );
  }
  return null;
}

export function saveHistoricalClimateCache(
  db: SqlDriver,
  coords: ClimateCoordinates,
  normals: ClimateNormalsData,
  fetchedAt: number = Date.now(),
  sourceModel: string = CLIMATE_HISTORY_SOURCE,
  elevationM: number | null = null,
): boolean {
  const key = climateCoordinateKey(coords);
  if (!key || !isValidNormals(normals) || !Number.isFinite(fetchedAt) || !sourceModel.trim()
    || (elevationM !== null && (!Number.isFinite(elevationM) || elevationM < 0))) return false;
  const previous = getHistoricalClimateCache(db, coords);
  const elevation = elevationM ?? previous?.elevationM ?? null;
  db.get(
    `INSERT INTO climate_history_cache (
       latitude_key, longitude_key, from_year, to_year, source_model, fetched_at,
       monthly_rain_mm, annual_rain_mm, mean_temperature_c, elevation_m
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(latitude_key, longitude_key, from_year, to_year, source_model) DO UPDATE SET
       fetched_at = excluded.fetched_at,
       monthly_rain_mm = excluded.monthly_rain_mm,
       annual_rain_mm = excluded.annual_rain_mm,
       mean_temperature_c = excluded.mean_temperature_c,
       elevation_m = excluded.elevation_m
     RETURNING latitude_key`,
    [key.latitude, key.longitude, normals.fromYear, normals.toYear, sourceModel,
      new Date(fetchedAt).toISOString(), JSON.stringify(normals.monthlyRainMm), normals.annualRainMm,
      normals.meanTemperatureC, elevation],
  );
  return true;
}

export function updateHistoricalClimateElevation(
  db: SqlDriver,
  coords: ClimateCoordinates,
  elevationM: number,
): void {
  const key = climateCoordinateKey(coords);
  if (!key || !Number.isFinite(elevationM) || elevationM < 0) return;
  db.all(
    `UPDATE climate_history_cache SET elevation_m = ?
      WHERE latitude_key = ? AND longitude_key = ? RETURNING latitude_key`,
    [elevationM, key.latitude, key.longitude],
  );
}
