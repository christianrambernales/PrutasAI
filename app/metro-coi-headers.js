/**
 * Cross-origin isolation for the local dev server.
 *
 * WHY THIS EXISTS
 *
 * `app/src/core/db/expoSqliteDriver.ts` uses expo-sqlite's *synchronous* API
 * (`execSync`, `getAllSync`, `getFirstSync`) because every repository in this
 * app is synchronous. On web, those calls cross into a Web Worker through
 * `invokeWorkerSync`, which allocates a `SharedArrayBuffer` to block on the
 * result.
 *
 * `SharedArrayBuffer` only exists on a **cross-origin isolated** page — one
 * served with:
 *
 *   Cross-Origin-Opener-Policy:   same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 *
 * Without them the constructor is `undefined` and the first database call
 * throws. `AppNavigator` opens the database in a `useMemo` during its first
 * render, so the exception kills the tree before anything paints: a blank
 * white screen with no visible error.
 *
 * `vercel.json` sets these headers for the deployed site. It has no effect on
 * `expo start`, so local web development hit exactly that white screen while
 * production would have been fine. The dev server is hosting too — this is
 * that same fix, in the one place it was missing.
 *
 * The values are deliberately identical to `vercel.json`'s. If you change one,
 * change both, or local and production stop agreeing about whether the
 * database works.
 */

const CROSS_ORIGIN_ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

/**
 * Wraps a Metro middleware so every dev-server response carries the headers.
 *
 * @param {Function} middleware
 * @returns {Function}
 */
function withCrossOriginIsolation(middleware) {
  return (req, res, next) => {
    for (const [header, value] of Object.entries(CROSS_ORIGIN_ISOLATION_HEADERS)) {
      res.setHeader(header, value);
    }
    return middleware(req, res, next);
  };
}

module.exports = { CROSS_ORIGIN_ISOLATION_HEADERS, withCrossOriginIsolation };
