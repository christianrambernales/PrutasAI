import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LOCKFILES = [
  { workspace: 'root', file: 'package-lock.json' },
  { workspace: 'app', file: 'app/package-lock.json' },
  { workspace: 'api', file: 'api/package-lock.json' },
];
const REGISTRY = 'https://registry.npmjs.org';
const CONCURRENCY = 12;
const RETRIES = 2;
const INVENTORY_START = '<!-- PACKAGE_PROVENANCE_START -->';
const INVENTORY_END = '<!-- PACKAGE_PROVENANCE_END -->';

function packageNameFromLockPath(lockPath) {
  const parts = lockPath.split('/');
  let packageIndex = -1;
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (parts[index] === 'node_modules') packageIndex = index + 1;
  }
  if (packageIndex < 0 || packageIndex >= parts.length) return null;
  if (parts[packageIndex].startsWith('@')) {
    return parts[packageIndex + 1] ? `${parts[packageIndex]}/${parts[packageIndex + 1]}` : null;
  }
  return parts[packageIndex];
}

export function extractLockEntries(lockfile, { workspace, lockPath }) {
  return Object.entries(lockfile.packages ?? {})
    .filter(([path, entry]) => path !== '' && entry?.version)
    .map(([path, entry]) => ({
      workspace,
      lockfile: lockPath,
      lockPath: path,
      packageName: entry.name || packageNameFromLockPath(path),
      version: String(entry.version),
      resolvedUrl: entry.resolved ?? null,
      lockIntegrity: entry.integrity ?? null,
      humanDisposition: '[ASSUMED]',
      reviewSource: '[PENDING: human review]',
    }));
}

export function sortInventory(rows) {
  return [...rows].sort((left, right) =>
    compareText(left.workspace, right.workspace)
    || compareText(left.packageName, right.packageName)
    || compareText(left.version, right.version)
    || compareText(left.lockPath, right.lockPath));
}

function compareText(left = '', right = '') {
  return left < right ? -1 : left > right ? 1 : 0;
}

function integrityTokens(integrity) {
  return new Set(String(integrity ?? '').split(/\s+/).filter(Boolean).map((token) => {
    const match = token.match(/^([a-z0-9]+)-([^?]+)(?:\?.*)?$/i);
    return match ? `${match[1].toLowerCase()}-${match[2]}` : null;
  }).filter(Boolean));
}

function canonicalUrlIdentity(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'registry.npmjs.org'
      || url.port || url.username || url.password || url.search || url.hash) return null;
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, '');
    return `${url.origin.toLowerCase()}${path}`;
  } catch {
    return null;
  }
}

function isPublicNpmRegistryUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.toLowerCase() === 'registry.npmjs.org'
      && !url.port && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

function normalizeRepository(repository) {
  const candidate = typeof repository === 'string' ? repository : repository?.url;
  if (!candidate || typeof candidate !== 'string') return null;
  const value = candidate.trim();
  if (!value) return null;
  if (/^github:[^/]/i.test(value)) return `https://github.com/${value.slice('github:'.length)}`;
  return value.replace(/^git\+/, '').replace(/\.git$/i, '');
}

export function analyzeRegistryMetadata(row, metadata) {
  const unresolvedReasons = [];
  if (!row.resolvedUrl) unresolvedReasons.push('Lockfile resolved URL is missing');
  else if (!isPublicNpmRegistryUrl(row.resolvedUrl)) {
    unresolvedReasons.push('Resolved source is not the public npm registry');
  }

  if (!metadata) {
    unresolvedReasons.unshift('Registry version is absent');
    return {
      registryExists: false,
      registryIntegrityMatch: null,
      registryTarballIdentity: null,
      registryTarballUrl: null,
      upstreamRepository: null,
      unresolvedReasons: [...new Set(unresolvedReasons)],
    };
  }

  let registryIntegrityMatch = null;
  if (!row.lockIntegrity) {
    unresolvedReasons.push('Lockfile integrity is missing');
  } else if (!metadata.dist?.integrity) {
    unresolvedReasons.push('Registry integrity metadata is missing');
  } else {
    const locked = integrityTokens(row.lockIntegrity);
    const registry = integrityTokens(metadata.dist.integrity);
    registryIntegrityMatch = [...locked].some((token) => registry.has(token));
    if (!registryIntegrityMatch) unresolvedReasons.push('Lockfile integrity does not match registry integrity');
  }

  const registryTarballUrl = metadata.dist?.tarball ?? null;
  let registryTarballIdentity = null;
  if (!registryTarballUrl) {
    unresolvedReasons.push('Registry tarball metadata is missing');
  } else if (row.resolvedUrl) {
    registryTarballIdentity = canonicalUrlIdentity(row.resolvedUrl) !== null
      && canonicalUrlIdentity(row.resolvedUrl) === canonicalUrlIdentity(registryTarballUrl);
    if (!registryTarballIdentity) unresolvedReasons.push('Resolved tarball does not match registry tarball identity');
  }

  const upstreamRepository = normalizeRepository(metadata.repository);
  if (!upstreamRepository) unresolvedReasons.push('Upstream repository metadata is missing');

  return {
    registryExists: true,
    registryIntegrityMatch,
    registryTarballIdentity,
    registryTarballUrl,
    upstreamRepository,
    unresolvedReasons: [...new Set(unresolvedReasons)],
  };
}

function safeDisplayUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) {
      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      return `${url.toString()} [query/credentials redacted]`;
    }
    return url.toString();
  } catch {
    return '[non-URL source redacted]';
  }
}

function registryVersionUrl(packageName, version) {
  const encodedName = encodeURIComponent(packageName)
    .replace(/^%40/i, '@')
    .replace(/%2f/gi, '%2f');
  return `${REGISTRY}/${encodedName}/${encodeURIComponent(version)}`;
}

async function fetchRegistryVersion(packageName, version, fetchImpl = fetch) {
  const url = registryVersionUrl(packageName, version);
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
      if (response.status === 404) return { metadata: null, attempts: attempt, error: null };
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { metadata: await response.json(), attempts: attempt, error: null };
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await new Promise((resolveDelay) => setTimeout(resolveDelay, 250 * attempt));
    }
  }
  return {
    metadata: null,
    attempts: RETRIES,
    error: lastError instanceof Error ? lastError.name : 'RequestError',
  };
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let next = 0;
  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= values.length) return;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return results;
}

function safeMetadataValue(value) {
  if (typeof value !== 'string') return value ?? null;
  return value.replace(/[\r\n]/g, ' ').trim();
}

function buildMachineRow(row, registryResult) {
  if (registryResult.error) {
    const staticReasons = [];
    if (!row.resolvedUrl) staticReasons.push('Lockfile resolved URL is missing');
    else if (!isPublicNpmRegistryUrl(row.resolvedUrl)) staticReasons.push('Resolved source is not the public npm registry');
    return {
      ...row,
      resolvedUrl: safeDisplayUrl(row.resolvedUrl),
      registryQueryStatus: `error:${registryResult.error}`,
      registryQueryAttempts: registryResult.attempts,
      registryExists: null,
      registryIntegrityMatch: null,
      registryTarballIdentity: null,
      registryTarballUrl: null,
      upstreamRepository: null,
      unresolvedReasons: [...staticReasons, 'Registry metadata query failed'],
    };
  }
  const analysis = analyzeRegistryMetadata(row, registryResult.metadata);
  return {
    ...row,
    resolvedUrl: safeDisplayUrl(row.resolvedUrl),
    lockIntegrity: safeMetadataValue(row.lockIntegrity),
    registryQueryStatus: registryResult.metadata ? 'found' : 'not-found',
    registryQueryAttempts: registryResult.attempts,
    registryIntegrity: safeMetadataValue(registryResult.metadata?.dist?.integrity),
    registryExists: analysis.registryExists,
    registryIntegrityMatch: analysis.registryIntegrityMatch,
    registryTarballIdentity: analysis.registryTarballIdentity,
    registryTarballUrl: safeDisplayUrl(analysis.registryTarballUrl),
    upstreamRepository: safeDisplayUrl(analysis.upstreamRepository),
    unresolvedReasons: analysis.unresolvedReasons,
  };
}

function markdownCell(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function renderInventory(rows, registryMetadataCount, observedAt) {
  const unresolvedCount = rows.filter((row) => row.unresolvedReasons.length > 0).length;
  const table = [
    '| Workspace | Lockfile | Lock path | Package | Version | Resolved URL | Lock integrity | Registry | Integrity match | Registry tarball identity | Registry tarball | Upstream repository | Unresolved | Human disposition | Review source |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((row) => [
      row.workspace,
      row.lockfile,
      row.lockPath,
      row.packageName,
      row.version,
      row.resolvedUrl,
      row.lockIntegrity,
      row.registryQueryStatus === 'found' ? 'exists' : row.registryQueryStatus === 'not-found' ? 'absent' : row.registryQueryStatus,
      row.registryIntegrityMatch,
      row.registryTarballIdentity,
      row.registryTarballUrl,
      row.upstreamRepository,
      row.unresolvedReasons.length ? row.unresolvedReasons.join('; ') : 'None detected by metadata check',
      row.humanDisposition,
      row.reviewSource,
    ].map(markdownCell)).map((cells) => `| ${cells.join(' | ')} |`),
  ].join('\n');
  const machineJson = JSON.stringify({
    generatedAt: observedAt,
    source: 'root/app/api package-lock.json files',
    registry: REGISTRY,
    registryConcurrency: CONCURRENCY,
    registryRetries: RETRIES,
    registryMetadataVersionsQueried: registryMetadataCount,
    observedEntries: rows.length,
    unresolvedEntries: unresolvedCount,
    humanReviewedEntries: 0,
    entries: rows,
  }, null, 2).replace(/`/g, '\\u0060');

  return [
    `Generated: ${observedAt} UTC. Exact lock entries: **${rows.length}**; unique package/version metadata records queried: **${registryMetadataCount}**; entries with unresolved metadata/source flags: **${unresolvedCount}**; human-reviewed entries: **0**.`,
    '',
    'Registry presence, integrity, tarball identity, and repository metadata are source checks only. Every package remains `[ASSUMED]` until a human records an authoritative review source and disposition.',
    '',
    '### Machine-readable inventory',
    '',
    '```json',
    machineJson,
    '```',
    '',
    '### Readable per-package ledger',
    '',
    table,
  ].join('\n');
}

function replaceInventorySection(document, inventory) {
  const start = document.indexOf(INVENTORY_START);
  const end = document.indexOf(INVENTORY_END);
  if (start < 0 || end < start) throw new Error('Package review file is missing valid inventory markers');
  return `${document.slice(0, start + INVENTORY_START.length)}\n\n${inventory}\n\n${document.slice(end)}`;
}

export async function collectPackageProvenance({ root = process.cwd(), fetchImpl = fetch, now = new Date() } = {}) {
  const entries = [];
  for (const { workspace, file } of LOCKFILES) {
    const fullPath = resolve(root, file);
    const lockfile = JSON.parse(readFileSync(fullPath, 'utf8'));
    entries.push(...extractLockEntries(lockfile, { workspace, lockPath: file }));
  }

  const sorted = sortInventory(entries);
  const versions = [...new Set(sorted.map(({ packageName, version }) => `${packageName}\u0000${version}`))];
  const resultByVersion = new Map();
  const metadataResults = await mapWithConcurrency(versions, CONCURRENCY, async (key) => {
    const separator = key.lastIndexOf('\u0000');
    const packageName = key.slice(0, separator);
    const version = key.slice(separator + 1);
    return [key, await fetchRegistryVersion(packageName, version, fetchImpl)];
  });
  for (const [key, result] of metadataResults) resultByVersion.set(key, result);

  const rows = sorted.map((row) => {
    const result = resultByVersion.get(`${row.packageName}\u0000${row.version}`);
    return buildMachineRow(row, result);
  });
  return {
    rows,
    registryMetadataCount: versions.length,
    generatedAt: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
}

async function main() {
  const root = process.cwd();
  const reviewPath = resolve(root, '.planning/phases/07-qa-accessibility-and-release-preparation/07-PACKAGE-LEGITIMACY-REVIEW.md');
  const review = readFileSync(reviewPath, 'utf8');
  const { rows, registryMetadataCount, generatedAt } = await collectPackageProvenance({ root });
  const inventory = renderInventory(rows, registryMetadataCount, generatedAt);
  writeFileSync(reviewPath, replaceInventorySection(review, inventory), 'utf8');
  const unresolvedCount = rows.filter((row) => row.unresolvedReasons.length > 0).length;
  console.log(`Package provenance inventory written: ${rows.length} entries; ${registryMetadataCount} registry versions; ${unresolvedCount} unresolved; 0 human-reviewed.`);
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === pathToFileURL(scriptPath).href) {
  main().catch((error) => {
    console.error(`Package provenance inventory failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  });
}
