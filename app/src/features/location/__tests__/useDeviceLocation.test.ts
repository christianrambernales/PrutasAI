/**
 * The device-location hook.
 *
 * These tests exist to pin the privacy promises the Settings screen prints:
 * permission is asked only on demand, the fix is coarse, and it is rounded
 * before anything else in the app can see it.
 *
 * `renderHook` is awaited because it is async in React Native Testing Library
 * v14 — the older synchronous form silently yields an undefined result.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useDeviceLocation } from '../useDeviceLocation';

const REVERSE = {
  city: 'Bacoor', principalSubdivision: 'Calabarzon (Region IV-A)', countryName: 'Philippines (the)',
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = (async () => ({ ok: true, status: 200, json: async () => REVERSE })) as unknown as typeof fetch;
});

/** Mount the hook and run one `locate()` to completion. */
async function located() {
  const { result } = await renderHook(() => useDeviceLocation());
  await act(async () => { result.current.locate(); });
  return result;
}

test('a granted fix is rounded to two decimals before it is exposed', async () => {
  const result = await located();
  await waitFor(() => expect(result.current.status).toBe('ready'));

  expect(result.current.place?.latitude).toBe(14.46);
  expect(result.current.place?.longitude).toBe(120.94);
});

test('the fix is named by reverse geocoding', async () => {
  const result = await located();
  await waitFor(() => expect(result.current.status).toBe('ready'));

  expect(result.current.place?.label).toBe('Bacoor, Calabarzon');
});

test('a refused permission reports denied and never reads a position', async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'denied', canAskAgain: true,
  });

  const result = await located();
  await waitFor(() => expect(result.current.status).toBe('denied'));

  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});

test('a failed reverse geocode still yields a usable coordinate label', async () => {
  global.fetch = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;

  const result = await located();
  await waitFor(() => expect(result.current.status).toBe('ready'));

  expect(result.current.place?.label).toBe('14.46, 120.94');
});

test('coarse accuracy is requested, never precise', async () => {
  const result = await located();
  await waitFor(() => expect(result.current.status).toBe('ready'));

  const options = (Location.getCurrentPositionAsync as jest.Mock).mock.calls[0][0];
  expect(options.accuracy).toBe(Location.Accuracy.Low);
  expect(options.accuracy).not.toBe(Location.Accuracy.Balanced);
});

test('permission is never requested until the user asks to be located', async () => {
  const { result } = await renderHook(() => useDeviceLocation());

  expect(result.current.status).toBe('idle');
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});

test('a permanently blocked permission is distinguished from a one-off refusal', async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'denied', canAskAgain: false,
  });

  const result = await located();
  await waitFor(() => expect(result.current.status).toBe('blocked'));
});

test('a fix that cannot be read is reported rather than left silent', async () => {
  (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValueOnce(new Error('no signal'));

  const result = await located();
  await waitFor(() => expect(result.current.status).toBe('error'));

  expect(result.current.error).not.toBeNull();
});

test('the precise fix never reaches app state, and is not what gets looked up', async () => {
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
    coords: { latitude: 14.458961234, longitude: 120.938512345 },
  });

  let reverseUrl = '';
  global.fetch = (async (url: string) => {
    reverseUrl = String(url);
    return { ok: true, status: 200, json: async () => REVERSE };
  }) as unknown as typeof fetch;

  const result = await located();
  await waitFor(() => expect(result.current.status).toBe('ready'));

  expect(result.current.place?.latitude).toBe(14.46);
  expect(result.current.place?.longitude).toBe(120.94);
  // The lookup is asked about the rounded point, so the precise fix does not
  // leave the device by that route either.
  expect(reverseUrl).toContain('latitude=14.46');
  expect(reverseUrl).not.toContain('14.4589');
});
