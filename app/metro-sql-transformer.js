/**
 * Metro transformer that turns a `.sql` file into a string module.
 *
 * `metro.config.js` puts `sql` in `sourceExts`, which makes Metro *resolve*
 * these files — but it then hands them to the JS parser, which chokes on the
 * first `CREATE TABLE`. Listing the extension is only half the job; something
 * has to convert the text into a module first.
 *
 * This went unnoticed because Jest has its own `.sql` transform
 * (src/core/db/testing/sqlTransform.js), so the whole suite passed while the
 * real bundler could not build the app. It only surfaced once the SQLite layer
 * made `seed.sql` a runtime import rather than a test-only one.
 */

/**
 * The whole conversion, kept pure and separate so it can be unit-tested without
 * loading Metro — which cannot be imported inside the Jest React Native
 * environment.
 *
 * JSON.stringify rather than a template literal: SQL contains quotes,
 * backslashes and newlines, and a backtick or `${` in a comment would otherwise
 * break out of the generated module.
 */
function sqlToModule(src) {
  return `module.exports = ${JSON.stringify(src)};`;
}

/**
 * Resolved lazily and via Expo's own config, because the package sits at a
 * nested path that differs between installs, and because requiring it at module
 * load would make this file unimportable from a test.
 */
function upstream() {
  const { getDefaultConfig } = require('expo/metro-config');
  return require(getDefaultConfig(__dirname).transformer.babelTransformerPath);
}

async function transform({ src, filename, options }) {
  const source = filename.endsWith('.sql') ? sqlToModule(src) : src;
  return upstream().transform({ src: source, filename, options });
}

module.exports = { transform, sqlToModule };
