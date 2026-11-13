import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { hashAllowlistedFiles, assertSafeRelativePath, runIsolatedBaseline } from './verify-baseline.mjs';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('verify-baseline - assertSafeRelativePath', (t) => {
  assert.doesNotThrow(() => assertSafeRelativePath('package.json'));
  assert.doesNotThrow(() => assertSafeRelativePath('app/package.json'));
  assert.throws(() => assertSafeRelativePath('../package.json'), /must be a safe relative path/);
  assert.throws(() => assertSafeRelativePath('/package.json'), /must be a safe relative path/);
});

test('verify-baseline - hashAllowlistedFiles', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gsd-verify-baseline-'));
  try {
    mkdirSync(join(dir, 'app'));
    mkdirSync(join(dir, 'app/src/core/db'), { recursive: true });
    
    // Create some files
    writeFileSync(join(dir, 'package.json'), '{"name":"root"}');
    writeFileSync(join(dir, 'app/package.json'), '{"name":"app"}');
    
    const hashes = hashAllowlistedFiles(dir);
    
    // Should be sorted and contain all allowlisted files
    assert.ok(hashes.length >= 12);
    const presentFiles = hashes.filter(h => !h.missing).map(h => h.path);
    assert.deepEqual(presentFiles, [
      'app/package.json',
      'package.json'
    ]);
    
    // Check if missing generated output is reported
    assert.ok(hashes.some(h => h.path === 'app/src/core/db/seed.sql' && h.missing === true));
    
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify-baseline - runIsolatedBaseline requires isolated directory', async (t) => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  await assert.rejects(
    runIsolatedBaseline(root),
    /must run in an isolated working directory/
  );
});
