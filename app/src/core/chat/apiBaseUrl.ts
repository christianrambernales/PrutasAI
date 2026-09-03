/**
 * The API base URL, or `''` when the app was built without a usable one.
 *
 * `createProxyProvider` treats any non-empty `baseUrl` as configured, and
 * `app/.env` ships `EXPO_PUBLIC_API_URL` as the placeholder
 * `https://<your-deployment>.vercel.app/api`. That combination made the app
 * report a working assistant while every request failed against a hostname that
 * does not resolve. Returning `''` for a placeholder is what lets Settings say
 * "No assistant URL set" truthfully.
 *
 * The check lives here rather than in `providers/proxy.ts`, which carries a note
 * asking that it stay unedited: its unchanged code is the evidence that the wire
 * contract survived the move from a Cloudflare Worker to a Vercel function.
 */
export function apiBaseUrl(env: string | undefined = process.env.EXPO_PUBLIC_API_URL): string {
  const value = (env ?? '').trim();
  if (value === '') return '';

  // An unfilled template. `new URL()` accepts these — angle brackets are legal
  // in a host — so parsing alone would not catch it.
  if (value.includes('<') || value.includes('>')) return '';

  // The rejection here is actually done by the `protocol` check below on every
  // runtime that matters. React Native does not use Hermes's or Node's `URL`:
  // `setUpXHR.js` polyfills `global.URL` with RN's own class
  // (`Libraries/Blob/URL.js`), whose single-argument constructor never throws —
  // it just assigns `this._url = url` — so on-device this `catch` cannot fire,
  // and `.protocol` falls back to a regex that still yields '' or the wrong
  // scheme for junk input. The `try`/`catch` is a backstop for the strict,
  // throwing `URL` used by Node (this file's own Jest run) and by browsers (the
  // web build); it is not the path device code takes, but it is real coverage
  // on those two runtimes, so it stays.
  try {
    const { protocol } = new URL(value);
    if (protocol !== 'http:' && protocol !== 'https:') return '';
  } catch {
    return '';
  }

  return value;
}
