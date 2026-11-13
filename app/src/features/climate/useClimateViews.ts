import { useCallback, useMemo } from 'react';
import { relativeTime, useClimate } from './useClimate';
import { judgeSuitability } from '../../core/climate/suitability';
import type { SqlDriver } from '../../core/db/driver';
import { climateCoordinateKey } from '../../core/db/repositories/climate';
import type {
  ClimateNormals, ClimateSnapshot, FruitSummary, Suitability,
} from '../viewModels';

type ClimateState = ReturnType<typeof useClimate>;
type SavedLocation = { label: string; latitude: number; longitude: number } | null;

export interface ClimateViewsInput {
  climate: ClimateState;
  savedLocation: SavedLocation;
  fruits: FruitSummary[];
  now?: number;
}

export interface ClimateViews {
  climate: ClimateState;
  snapshot: ClimateSnapshot | null;
  normals: ClimateNormals | null;
  suitabilityFor: (fruitKey: string) => Suitability | null;
  savedLocationLabel: string;
}

/** The pure core, so every derivation can be asserted without a renderer. */
export function buildClimateViews(input: ClimateViewsInput): ClimateViews {
  const { climate, savedLocation, fruits } = input;
  const location = savedLocation && climateCoordinateKey(savedLocation);
  const matchesSavedLocation = !climate.locationKey || !location
    || climate.locationKey === `${location.latitude},${location.longitude}`;
  const currentStatus = climate.currentStatus ?? climate.status;

  const current = matchesSavedLocation ? climate.current : null;
  const snapshot: ClimateSnapshot | null = !current || !savedLocation ? null : {
    place: savedLocation.label,
    coordsLabel: `${savedLocation.latitude.toFixed(2)}, ${savedLocation.longitude.toFixed(2)} · rounded to 2 dp`,
    freshness: currentStatus === 'error' ? 'stale' : currentStatus === 'cached' ? 'cached' : currentStatus === 'stale' ? 'stale' : 'live',
    freshnessLabel: currentStatus === 'error'
      ? `Stale · ${relativeTime(climate.currentFetchedAt ?? climate.fetchedAt ?? null, input.now)}`
      : climate.currentStatus === 'cached' || climate.currentStatus === 'stale'
        ? `Stale · ${relativeTime(climate.currentFetchedAt ?? climate.fetchedAt ?? null, input.now)}`
        : `Updated ${relativeTime(climate.currentFetchedAt ?? climate.fetchedAt ?? null, input.now)}`,
    temperatureC: Math.round(current.temperatureC),
    condition: current.condition,
    feelsLikeLabel: `Feels like ${Math.round(current.apparentTemperatureC)}°`,
    humidityPct: Math.round(current.humidityPct),
    rainTodayMm: current.precipitationMm,
    elevationM: current.elevationM,
    fetchedAt: climate.currentFetchedAt ?? climate.fetchedAt ?? null,
  };

  const n = matchesSavedLocation ? climate.normals : null;
  const normals: ClimateNormals | null = !n ? null : {
    monthlyRainMm: n.monthlyRainMm,
    annualRainMm: n.annualRainMm,
    meanTemperatureC: n.meanTemperatureC,
    fetchedLabel: `${n.toYear - n.fromYear + 1}-year mean · ${n.fromYear}–${n.toYear}`,
  };

  /**
   * The verdict is computed from real normals, never from today's reading.
   * Returns null only when the fruit has no requirement row — a missing-normals
   * failure is reported separately so the two are never confused.
   */
  const suitabilityFor = (fruitKey: string): Suitability | null => {
    const judged = judgeSuitability({
      fruitKey,
      normals: matchesSavedLocation ? climate.normals : null,
      elevationM: matchesSavedLocation ? (climate.current?.elevationM ?? climate.historicalElevationM ?? null) : null,
    });
    const fruit = fruits.find(f => f.key === fruitKey);
    return {
      fruitEmoji: fruit?.emoji ?? '',
      fruitName: fruit?.nameEn ?? fruitKey,
      verdict: judged.verdict,
      headline: judged.headline,
      detail: judged.detail,
      evidence: judged.evidence,
      basisLabel: judged.basisLabel,
      sourceLabel: climate.historicalSource
        ? `${judged.sourceLabel} · Historical source: ${climate.historicalSource}`
        : judged.sourceLabel,
      provisional: judged.provisional,
      warning: judged.warning,
      missingFields: judged.missingFields,
      evidenceFetchedAt: matchesSavedLocation ? climate.historicalFetchedAt : null,
      evidenceSource: matchesSavedLocation ? climate.historicalSource : null,
      evidencePeriod: n ? { fromYear: n.fromYear, toYear: n.toYear } : null,
      evidenceCached: matchesSavedLocation && (climate.historicalStatus === 'cached' || climate.historicalStatus === 'stale'),
      evidenceStatus: !matchesSavedLocation || !n
        ? 'unavailable'
        : climate.historicalStatus === 'stale' ? 'stale'
          : climate.historicalStatus === 'cached' ? 'cached' : 'live',
      evidenceAgeMs: matchesSavedLocation && climate.historicalFetchedAt != null
        ? Math.max(0, (input.now ?? Date.now()) - climate.historicalFetchedAt)
        : null,
    };
  };

  const savedLocationLabel = savedLocation
    ? `${savedLocation.label} · ${savedLocation.latitude.toFixed(2)}, ${savedLocation.longitude.toFixed(2)}`
    : 'No location saved';

  return { climate, snapshot, normals, suitabilityFor, savedLocationLabel };
}

export function useClimateViews(
  input: { savedLocation: SavedLocation; fruits: FruitSummary[]; db: SqlDriver },
): ClimateViews {
  const climate = useClimate(input.savedLocation, input.db);
  const { savedLocation, fruits } = input;

  const snapshot = useMemo(
    () => buildClimateViews({ climate, savedLocation, fruits }).snapshot,
    [climate.current, climate.currentFetchedAt, climate.currentStatus, climate.locationKey, savedLocation, fruits],
  );
  const normals = useMemo(
    () => buildClimateViews({ climate, savedLocation, fruits }).normals,
    [climate.normals, climate.locationKey, savedLocation, fruits],
  );
  const suitabilityFor = useCallback(
    (fruitKey: string) =>
      buildClimateViews({ climate, savedLocation, fruits }).suitabilityFor(fruitKey),
    [climate.normals, climate.current, climate.locationKey, climate.historicalElevationM, climate.historicalFetchedAt, climate.historicalSource, climate.historicalStatus, fruits, savedLocation],
  );
  const savedLocationLabel = useMemo(
    () => buildClimateViews({ climate, savedLocation, fruits }).savedLocationLabel,
    [savedLocation, climate, fruits],
  );

  return { climate, snapshot, normals, suitabilityFor, savedLocationLabel };
}
