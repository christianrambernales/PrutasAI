/**
 * app/.env ships EXPO_PUBLIC_API_URL as an unfilled placeholder. The proxy
 * provider treats any non-empty string as "configured", so the placeholder made
 * the app claim it had a working assistant while every call failed. Normalising
 * to '' here is what makes Settings say "No assistant URL set" honestly.
 */

import { apiBaseUrl } from '../apiBaseUrl';

test('a real deployment URL is kept', () => {
  expect(apiBaseUrl('https://prutasai.vercel.app/api')).toBe('https://prutasai.vercel.app/api');
});

test('a trailing space is trimmed, not treated as configured', () => {
  expect(apiBaseUrl('  https://prutasai.vercel.app/api  ')).toBe('https://prutasai.vercel.app/api');
});

test('unset is unconfigured', () => {
  expect(apiBaseUrl(undefined)).toBe('');
  expect(apiBaseUrl('')).toBe('');
  expect(apiBaseUrl('   ')).toBe('');
});

test("the shipped placeholder is unconfigured", () => {
  expect(apiBaseUrl('https://<your-deployment>.vercel.app/api')).toBe('');
});

test('any angle-bracket placeholder segment is unconfigured', () => {
  expect(apiBaseUrl('https://<host>/api')).toBe('');
  expect(apiBaseUrl('https://example.com/<path>')).toBe('');
});

test('a non-absolute or non-http value is unconfigured', () => {
  expect(apiBaseUrl('localhost:3000')).toBe('');
  expect(apiBaseUrl('ftp://example.com')).toBe('');
  expect(apiBaseUrl('not a url')).toBe('');
});

describe('under React Native\'s lenient, non-throwing URL polyfill', () => {
  // React Native replaces global.URL with its own class (Libraries/Blob/URL.js,
  // installed by setUpXHR.js) whose single-argument constructor never throws and
  // whose `.protocol` getter is derived from the regex
  // /^([a-zA-Z][a-zA-Z\d+\-.]*):/. Node's strict URL (what Jest runs by default)
  // throws instead, so the suite above never exercises the code path that
  // actually runs on-device. This block stands in for RN's URL to pin that the
  // `protocol` check alone — without any help from a throw — still rejects junk
  // input and still accepts a real URL.
  const OriginalURL = globalThis.URL;

  class LenientRNURL {
    protocol: string;
    constructor(url: string) {
      const match = /^([a-zA-Z][a-zA-Z\d+\-.]*):/.exec(url);
      this.protocol = match ? `${match[1]}:` : '';
    }
  }

  beforeEach(() => {
    // @ts-expect-error - swapping in a minimal stand-in for the RN polyfill
    globalThis.URL = LenientRNURL;
  });

  afterEach(() => {
    globalThis.URL = OriginalURL;
  });

  test('a real deployment URL is still accepted', () => {
    expect(apiBaseUrl('https://prutasai.vercel.app/api')).toBe('https://prutasai.vercel.app/api');
  });

  test('junk input is still rejected by the protocol check, not by a throw', () => {
    expect(apiBaseUrl('not a url')).toBe('');
    expect(apiBaseUrl('localhost:3000')).toBe('');
    expect(apiBaseUrl('ftp://example.com')).toBe('');
  });
});
