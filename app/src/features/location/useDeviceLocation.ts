import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { Place, reverseGeocode, roundCoordinate } from '../../core/geo/geocoding';

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'blocked' | 'error';

export interface DeviceLocation {
  status: LocationStatus;
  place: Place | null;
  error: string | null;
  locate: () => void;
}

/**
 * One coarse fix, on demand.
 *
 * Permission is requested when the user taps, never at launch. `Accuracy.Low`
 * is deliberate: it is the privacy promise printed on the Settings screen, and
 * climate normals are area averages where a precise fix would add nothing.
 */
export function useDeviceLocation(): DeviceLocation {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [place, setPlace] = useState<Place | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(() => {
    setStatus('locating');
    setError(null);

    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          setStatus(permission.canAskAgain === false ? 'blocked' : 'denied');
          return;
        }

        const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const latitude = roundCoordinate(fix.coords.latitude);
        const longitude = roundCoordinate(fix.coords.longitude);

        // Naming is a convenience, not a requirement — a failed lookup must not
        // lose a perfectly good fix. The rounded pair is what is looked up, so
        // the precise one never leaves the device either.
        let named: Place | null = null;
        try {
          named = await reverseGeocode({ latitude, longitude });
        } catch {
          named = null;
        }

        setPlace(
          named ?? {
            label: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
            latitude,
            longitude,
            region: '',
            country: '',
            elevationM: null,
          },
        );
        setStatus('ready');
      } catch {
        setError('Could not get a location fix.');
        setStatus('error');
      }
    })();
  }, []);

  return { status, place, error, locate };
}
