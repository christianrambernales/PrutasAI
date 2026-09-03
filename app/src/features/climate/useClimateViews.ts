import { useCallback, useMemo } from 'react';
import { relativeTime, useClimate } from './useClimate';
import { judgeSuitability } from '../../core/climate/suitability';
import type {
  ClimateNormals, ClimateSnapshot, FruitSummary, Suitability,
} from '../viewModels';

type ClimateState = ReturnType<typeof useClimate>;
type SavedLocation = { label: string; latitude: number; longitude: number } | null;

export interface ClimateViewsInput {
  climate: ClimateState;
  savedLocation: SavedLocation;
  fruits: FruitSummary[];
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

  const current = climate.current;
  const snapshot: ClimateSnapshot | null = !current || !savedLocation ? null : {
    place: savedLocation.label,
    coordsLabel: `${savedLocation.latitude.toFixed(2)}, ${savedLocation.longitude.toFixed(2)} · rounded to 2 dp`,
    freshness: climate.status === 'error' ? 'stale' : 'live',
    freshnessLabel: climate.status === 'error'
      ? `Stale · ${relativeTime(climate.fetchedAt)}`
      : `Updated ${relativeTime(climate.fetchedAt)}`,
    temperatureC: Math.round(current.temperatureC),
    condition: current.condition,
    feelsLikeLabel: `Feels like ${Math.round(current.apparentTemperatureC)}°`,
    humidityPct: Math.round(current.humidityPct),
    rainTodayMm: current.precipitationMm,
    elevationM: current.elevationM,
  };

  const n = climate.normals;
  const normals: ClimateNormals | null = !n ? null : {
    monthlyRainMm: n.monthlyRainMm,
    annualRainMm: n.annualRainMm,
    meanTemperatureC: n.meanTemperatureC,
    fetchedLabel: `${n.fromYear}–${n.toYear} mean`,
  };

  /**
   * The verdict is computed from real normals, never from today's reading.
   * Returns null only when the fruit has no requirement row — a missing-normals
   * failure is reported separately so the two are never confused.
   */
  const suitabilityFor = (fruitKey: string): Suitability | null => {
    const judged = judgeSuitability({
      fruitKey,
      normals: climate.normals,
      elevationM: climate.current?.elevationM ?? null,
    });
    if (judged.verdict === 'insufficient_data') return null;
    const fruit = fruits.find(f => f.key === fruitKey);
    return {
      fruitEmoji: fruit?.emoji ?? '',
      fruitName: fruit?.nameEn ?? fruitKey,
      verdict: judged.verdict,
      headline: judged.headline,
      detail: judged.detail,
      evidence: judged.evidence,
      basisLabel: judged.basisLabel,
      sourceLabel: judged.sourceLabel,
    };
  };

  const savedLocationLabel = savedLocation
    ? `${savedLocation.label} · ${savedLocation.latitude.toFixed(2)}, ${savedLocation.longitude.toFixed(2)}`
    : 'No location saved';

  return { climate, snapshot, normals, suitabilityFor, savedLocationLabel };
}

export function useClimateViews(
  input: { savedLocation: SavedLocation; fruits: FruitSummary[] },
): ClimateViews {
  const climate = useClimate(input.savedLocation);
  const { savedLocation, fruits } = input;

  const snapshot = useMemo(
    () => buildClimateViews({ climate, savedLocation, fruits }).snapshot,
    [climate.current, climate.fetchedAt, climate.status, savedLocation, fruits],
  );
  const normals = useMemo(
    () => buildClimateViews({ climate, savedLocation, fruits }).normals,
    [climate.normals, savedLocation, fruits],
  );
  const suitabilityFor = useCallback(
    (fruitKey: string) =>
      buildClimateViews({ climate, savedLocation, fruits }).suitabilityFor(fruitKey),
    [climate.normals, climate.current, fruits, savedLocation],
  );
  const savedLocationLabel = useMemo(
    () => buildClimateViews({ climate, savedLocation, fruits }).savedLocationLabel,
    [savedLocation, climate, fruits],
  );

  return { climate, snapshot, normals, suitabilityFor, savedLocationLabel };
}
