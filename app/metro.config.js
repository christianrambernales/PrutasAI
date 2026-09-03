const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Model weights are copied in by scripts/sync-models.mjs and shipped as assets.
config.resolver.assetExts.push('tflite');

/**
 * expo-sqlite's *web* build runs SQLite as WebAssembly and imports
 * `wa-sqlite.wasm` directly. Metro does not resolve `.wasm` out of the box — it
 * is in neither the default `assetExts` nor `sourceExts` — so web bundling died
 * with "Unable to resolve ./wa-sqlite/wa-sqlite.wasm" the moment the database
 * layer landed. Android never hit it because it uses the native SQLite build.
 *
 * NOTE: this makes the web bundle *build*. Actually running SQLite in a browser
 * additionally needs cross-origin isolation (COOP/COEP response headers). Those
 * cannot be set from here — Expo prepends the middleware that serves the HTML
 * ahead of anything `config.server.enhanceMiddleware` can reach. vercel.json
 * sets them for the deployed site and scripts/start-web.mjs for local web.
 */
config.resolver.assetExts.push('wasm');

// The generated seed is imported as a string. `sourceExts` makes Metro resolve
// the file; the transformer below is what stops it being parsed as JavaScript.
config.resolver.sourceExts.push('sql');
config.transformer.babelTransformerPath = require.resolve('./metro-sql-transformer.js');

module.exports = config;
