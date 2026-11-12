import { useCallback, useEffect, useRef, useState } from 'react';
import type { SavedLocation } from '../../state/appState';
import {
  ClimateNormalsData,
  CurrentWeather,
  fetchCurrentWeather,
  fetchNormals,
} from '../../core/climate/openMeteo';
import type { SqlDriver } from '../../core/db/driver';
import {
  CLIMATE_HISTORY_SOURCE,
  climateCoordinateKey,
  getHistoricalClimateCache,
  saveHistoricalClimateCache,
  updateHistoricalClimateElevation,
} from '../../core/db/repositories/climate';

export type ClimateStatus = 'idle' | 'loading' | 'ready' | 'error';
export type ClimateEndpointStatus = ClimateStatus | 'cached' | 'stale';

export interface ClimateData {
  status: ClimateStatus;
  currentStatus: ClimateEndpointStatus;
  historicalStatus: ClimateEndpointStatus;
  current: CurrentWeather | null;
  normals: ClimateNormalsData | null;
  /** Backwards-compatible alias for the current observation's fetch time. */
  fetchedAt: number | null;
  currentFetchedAt: number | null;
  historicalFetchedAt: number | null;
  historicalSource: string | null;
  historicalElevationM: number | null;
  locationKey: string | null;
  error: string | null;
  refresh: () => void;
}

function locationKey(location: SavedLocation | null): string | null {
  if (!location) return null;
  const rounded = climateCoordinateKey(location);
  return rounded ? `${rounded.latitude},${rounded.longitude}` : null;
}

/**
 * Fetch current conditions and archive evidence independently. The historical
 * inputs are retained in SQLite and re-judged after a cold start so a verdict
 * never outlives the range policy or loses its source/period metadata.
 */
export function useClimate(location: SavedLocation | null, db: SqlDriver): ClimateData {
  const [status, setStatus] = useState<ClimateStatus>('idle');
  const [currentStatus, setCurrentStatus] = useState<ClimateEndpointStatus>('idle');
  const [historicalStatus, setHistoricalStatus] = useState<ClimateEndpointStatus>('idle');
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [normals, setNormals] = useState<ClimateNormalsData | null>(null);
  const [currentFetchedAt, setCurrentFetchedAt] = useState<number | null>(null);
  const [historicalFetchedAt, setHistoricalFetchedAt] = useState<number | null>(null);
  const [historicalSource, setHistoricalSource] = useState<string | null>(null);
  const [historicalElevationM, setHistoricalElevationM] = useState<number | null>(null);
  const [activeLocationKey, setActiveLocationKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce(n => n + 1), []);
  const latest = useRef(0);

  useEffect(() => {
    if (!location) {
      setStatus('idle');
      setCurrentStatus('idle');
      setHistoricalStatus('idle');
      setCurrent(null);
      setNormals(null);
      setCurrentFetchedAt(null);
      setHistoricalFetchedAt(null);
      setHistoricalSource(null);
      setHistoricalElevationM(null);
      setActiveLocationKey(null);
      setError(null);
      return;
    }

    const run = ++latest.current;
    const controller = new AbortController();
    const coords = { latitude: location.latitude, longitude: location.longitude };
    const key = locationKey(location);
    const cache = getHistoricalClimateCache(db, coords);

    // Clear first, then hydrate only data keyed to this rounded saved site. This
    // prevents a previous location's reading flashing under a new label.
    setActiveLocationKey(key);
    setCurrent(null);
    setCurrentFetchedAt(null);
    setCurrentStatus('loading');
    setNormals(cache?.normals ?? null);
    setHistoricalFetchedAt(cache?.fetchedAt ?? null);
    setHistoricalSource(cache?.sourceModel ?? null);
    setHistoricalElevationM(cache?.elevationM ?? null);
    setHistoricalStatus(cache ? 'cached' : 'loading');
    setStatus('loading');
    setError(null);

    let currentSucceeded = false;
    let historicalSucceeded = false;
    // Keep the latest elevation in the effect closure as well as in SQLite.
    // If live weather resolves before the first archive row exists, the cache
    // write below must still include that independently fetched value.
    let elevationM = cache?.elevationM ?? null;

    const currentRequest = fetchCurrentWeather(coords, { signal: controller.signal })
      .then(value => {
        if (run !== latest.current || controller.signal.aborted) return;
        currentSucceeded = true;
        const fetched = Date.now();
        setCurrent(value);
        setCurrentFetchedAt(fetched);
        setCurrentStatus('ready');
        if (value.elevationM !== null) {
          elevationM = value.elevationM;
          updateHistoricalClimateElevation(db, coords, value.elevationM);
          setHistoricalElevationM(value.elevationM);
        } else {
          setHistoricalElevationM(elevationM);
        }
      })
      .catch(() => {
        if (run !== latest.current || controller.signal.aborted) return;
        setCurrentStatus('error');
        setError('Could not reach current climate conditions.');
      });

    const historicalRequest = fetchNormals(coords, { years: 5, signal: controller.signal })
      .then(value => {
        if (run !== latest.current || controller.signal.aborted) return;
        const fetched = Date.now();
        const accepted = saveHistoricalClimateCache(
          db, coords, value, fetched, CLIMATE_HISTORY_SOURCE, elevationM,
        );
        if (!accepted) throw new Error('Historical climate data failed validation.');
        historicalSucceeded = true;
        setNormals(value);
        setHistoricalFetchedAt(fetched);
        setHistoricalSource(CLIMATE_HISTORY_SOURCE);
        setHistoricalElevationM(elevationM);
        setHistoricalStatus('ready');
      })
      .catch(() => {
        if (run !== latest.current || controller.signal.aborted) return;
        setHistoricalStatus(cache ? 'stale' : 'error');
        setError(previous => previous ?? 'Could not reach historical climate evidence.');
      });

    void Promise.all([currentRequest, historicalRequest]).then(() => {
      if (run !== latest.current || controller.signal.aborted) return;
      const anySuccess = currentSucceeded || historicalSucceeded || cache !== null;
      setStatus(anySuccess ? 'ready' : 'error');
      if (currentSucceeded && historicalSucceeded) setError(null);
    });

    return () => controller.abort();
  }, [location, db, nonce]);

  return {
    status,
    currentStatus,
    historicalStatus,
    current,
    normals,
    fetchedAt: currentFetchedAt,
    currentFetchedAt,
    historicalFetchedAt,
    historicalSource,
    historicalElevationM,
    locationKey: activeLocationKey,
    error,
    refresh,
  };
}

/** "just now" / "12 min ago" / "3 h ago" — for the freshness chip. */
export function relativeTime(from: number | null, now: number = Date.now()): string {
  if (from === null) return 'never';
  const seconds = Math.max(0, Math.round((now - from) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
