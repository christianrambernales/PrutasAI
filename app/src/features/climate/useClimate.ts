import { useCallback, useEffect, useRef, useState } from 'react';
import type { SavedLocation } from '../../state/appState';
import {
  ClimateNormalsData,
  CurrentWeather,
  fetchCurrentWeather,
  fetchNormals,
} from '../../core/climate/openMeteo';

export type ClimateStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ClimateData {
  status: ClimateStatus;
  current: CurrentWeather | null;
  normals: ClimateNormalsData | null;
  /** Device clock, used only for the "updated N ago" label. */
  fetchedAt: number | null;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches current conditions and multi-year normals for the saved location.
 *
 * Two calls rather than one because they come from different Open-Meteo
 * endpoints and have very different lifetimes: conditions go stale in minutes,
 * normals in years. A failure keeps whatever was already fetched — showing a
 * slightly old reading beats blanking the screen — and says so through
 * `status`, so the UI never presents stale data as live.
 */
export function useClimate(location: SavedLocation | null): ClimateData {
  const [status, setStatus] = useState<ClimateStatus>('idle');
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [normals, setNormals] = useState<ClimateNormalsData | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bumped to force a refetch; also lets an in-flight response be ignored.
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce(n => n + 1), []);

  const latest = useRef(0);

  useEffect(() => {
    if (!location) {
      setStatus('idle');
      setCurrent(null);
      setNormals(null);
      setFetchedAt(null);
      setError(null);
      return;
    }

    const run = ++latest.current;
    const controller = new AbortController();
    setStatus('loading');
    setError(null);

    const coords = { latitude: location.latitude, longitude: location.longitude };

    Promise.all([
      fetchCurrentWeather(coords, { signal: controller.signal }),
      fetchNormals(coords, { years: 5, signal: controller.signal }),
    ])
      .then(([nextCurrent, nextNormals]) => {
        if (run !== latest.current) return;
        setCurrent(nextCurrent);
        setNormals(nextNormals);
        setFetchedAt(Date.now());
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (run !== latest.current || controller.signal.aborted) return;
        setError(
          cause instanceof Error && /\d{3}/.test(cause.message)
            ? cause.message
            : 'Could not reach the climate service.',
        );
        setStatus('error');
      });

    return () => controller.abort();
  }, [location, nonce]);

  return { status, current, normals, fetchedAt, error, refresh };
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
