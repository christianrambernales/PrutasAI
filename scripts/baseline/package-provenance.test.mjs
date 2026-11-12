import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  analyzeRegistryMetadata,
  extractLockEntries,
  sortInventory,
} from './package-provenance.mjs';

test('extractLockEntries derives scoped and nested package names', () => {
  const entries = extractLockEntries({
    packages: {
      'node_modules/@scope/root': {
        version: '1.0.0',
        resolved: 'https://registry.npmjs.org/@scope/root/-/root-1.0.0.tgz',
        integrity: 'sha512-root',
      },
      'node_modules/@scope/root/node_modules/@nested/pkg': {
        version: '2.0.0',
        resolved: 'https://registry.npmjs.org/@nested%2fpkg/-/pkg-2.0.0.tgz',
        integrity: 'sha512-nested',
      },
    },
  }, { workspace: 'app', lockPath: 'app/package-lock.json' });

  assert.deepEqual(entries.map(({ packageName, lockPath }) => ({ packageName, lockPath })), [
    { packageName: '@scope/root', lockPath: 'node_modules/@scope/root' },
    { packageName: '@nested/pkg', lockPath: 'node_modules/@scope/root/node_modules/@nested/pkg' },
  ]);
});

test('sortInventory is stable by workspace, package, version, and lock path', () => {
  const input = [
    { workspace: 'app', packageName: 'z', version: '1', lockPath: 'node_modules/z' },
    { workspace: 'root', packageName: 'a', version: '2', lockPath: 'node_modules/a' },
    { workspace: 'app', packageName: '@scope/a', version: '1', lockPath: 'node_modules/x/node_modules/@scope/a' },
    { workspace: 'app', packageName: '@scope/a', version: '1', lockPath: 'node_modules/@scope/a' },
  ];

  assert.deepEqual(sortInventory(input).map(({ workspace, packageName, version, lockPath }) => ({
    workspace,
    packageName,
    version,
    lockPath,
  })), [
    { workspace: 'app', packageName: '@scope/a', version: '1', lockPath: 'node_modules/@scope/a' },
    { workspace: 'app', packageName: '@scope/a', version: '1', lockPath: 'node_modules/x/node_modules/@scope/a' },
    { workspace: 'app', packageName: 'z', version: '1', lockPath: 'node_modules/z' },
    { workspace: 'root', packageName: 'a', version: '2', lockPath: 'node_modules/a' },
  ]);
});

test('analyzeRegistryMetadata marks an absent registry version unresolved', () => {
  const result = analyzeRegistryMetadata({
    resolvedUrl: 'https://registry.npmjs.org/missing/-/missing-1.0.0.tgz',
    lockIntegrity: 'sha512-locked',
  }, null);

  assert.equal(result.registryExists, false);
  assert.equal(result.registryIntegrityMatch, null);
  assert.equal(result.registryTarballIdentity, null);
  assert.equal(result.upstreamRepository, null);
  assert.deepEqual(result.unresolvedReasons, ['Registry version is absent']);
});

test('analyzeRegistryMetadata reports an integrity mismatch and repository metadata', () => {
  const result = analyzeRegistryMetadata({
    resolvedUrl: 'https://registry.npmjs.org/example/-/example-1.0.0.tgz',
    lockIntegrity: 'sha512-locked',
  }, {
    dist: {
      integrity: 'sha512-registry',
      tarball: 'https://registry.npmjs.org/example/-/example-1.0.0.tgz',
    },
    repository: { type: 'git', url: 'git+https://github.com/example/example.git' },
  });

  assert.equal(result.registryExists, true);
  assert.equal(result.registryIntegrityMatch, false);
  assert.equal(result.registryTarballIdentity, true);
  assert.equal(result.upstreamRepository, 'https://github.com/example/example');
  assert.deepEqual(result.unresolvedReasons, ['Lockfile integrity does not match registry integrity']);
});

test('analyzeRegistryMetadata flags non-registry resolved sources', () => {
  const result = analyzeRegistryMetadata({
    resolvedUrl: 'git+https://github.com/example/example.git',
    lockIntegrity: 'sha512-locked',
  }, {
    dist: {
      integrity: 'sha512-locked',
      tarball: 'https://registry.npmjs.org/example/-/example-1.0.0.tgz',
    },
    repository: 'https://github.com/example/example',
  });

  assert.equal(result.registryExists, true);
  assert.equal(result.registryIntegrityMatch, true);
  assert.equal(result.registryTarballIdentity, false);
  assert.ok(result.unresolvedReasons.includes('Resolved source is not the public npm registry'));
  assert.ok(result.unresolvedReasons.includes('Resolved tarball does not match registry tarball identity'));
});

test('analyzeRegistryMetadata rejects a registry hostname on a nonstandard port', () => {
  const result = analyzeRegistryMetadata({
    resolvedUrl: 'https://registry.npmjs.org:444/example/-/example-1.0.0.tgz',
    lockIntegrity: 'sha512-locked',
  }, {
    dist: {
      integrity: 'sha512-locked',
      tarball: 'https://registry.npmjs.org/example/-/example-1.0.0.tgz',
    },
    repository: 'https://github.com/example/example',
  });

  assert.equal(result.registryTarballIdentity, false);
  assert.ok(result.unresolvedReasons.includes('Resolved source is not the public npm registry'));
  assert.ok(result.unresolvedReasons.includes('Resolved tarball does not match registry tarball identity'));
});
