/**
 * The app ships no credential.
 *
 * Every `EXPO_PUBLIC_*` value is inlined into the JS bundle, so a key in `.env`
 * is a key in the APK. This build once shipped a live Gemini key that way. The
 * Vercel function holds it now, and these tests fail if it ever comes back.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const APP_ROOT = join(__dirname, '../../../..');
const SRC = join(APP_ROOT, 'src');
/** This file names the forbidden patterns in order to look for them. */
const SELF = join(__dirname, 'noSecrets.test.ts');

/**
 * A credential, a Google AI Studio key, or the upstream the Vercel function fronts.
 *
 * Assembled from fragments rather than written out, so that grepping the tree
 * for a leaked key returns nothing at all — including this detector. A literal
 * here would be indistinguishable from the thing it looks for.
 */
const FORBIDDEN = [
  new RegExp(['EXPO', 'PUBLIC', 'GEMINI', 'API', 'KEY'].join('_')),
  new RegExp(`${'AI'}${'za'}[0-9A-Za-z_-]{10}`),
  new RegExp(`${'generative'}language\\.googleapis\\.com`),
  new RegExp(['TURSO', 'AUTH', 'TOKEN'].join('_')),
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|js|jsx|json)$/.test(entry) ? [path] : [];
  });
}

test('the .env file carries no credential, only the public Vercel API URL', () => {
  const env = readFileSync(join(APP_ROOT, '.env'), 'utf8');
  for (const pattern of FORBIDDEN) {
    expect(env).not.toMatch(pattern);
  }
  // AI Studio's newer key format, which the deleted provider also accepted.
  expect(env).not.toMatch(/AQ\.[0-9A-Za-z_-]{10}/);
  expect(env).toContain('EXPO_PUBLIC_API_URL');
});

test('no source file reads a model credential or calls the model host directly', () => {
  const offenders = sourceFiles(SRC)
    .filter(path => path !== SELF)
    .filter(path => {
      const body = readFileSync(path, 'utf8');
      return FORBIDDEN.some(pattern => pattern.test(body));
    });
  expect(offenders).toEqual([]);
});

test('the in-app Gemini provider is gone, not merely unused', () => {
  // Leaving the file would invite someone to wire the key back in.
  expect(existsSync(join(SRC, 'core/chat/providers/gemini.ts'))).toBe(false);
});
