import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, isAbsolute, normalize, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const ALLOWLIST_EXACT = [
  'package.json',
  'package-lock.json',
  'app/package.json',
  'app/package-lock.json',
  'api/package.json',
  'api/package-lock.json',
  'models/manifest.json',
  'app/src/core/db/seed.sql',
  'ml/classes.json',
  'app/src/core/types/knowledge.ts',
  'app/src/core/ml/manifest.json',
  'app/src/core/ml/bundledModels.ts'
];

const ALLOWLIST_DIRS = [
  'knowledge'
];

export function assertSafeRelativePath(p) {
  if (isAbsolute(p) || p.startsWith('..') || p.startsWith(`.${normalize('/')}.`)) {
    throw new Error(`Path "${p}" must be a safe relative path.`);
  }
}

function collectFiles(dir, current = '', files = []) {
  const target = join(dir, current);
  if (!existsSync(target)) return files;
  
  const stat = statSync(target);
  if (stat.isDirectory()) {
    for (const child of readdirSync(target)) {
      collectFiles(dir, join(current, child).replace(/\\/g, '/'), files);
    }
  } else {
    files.push(current);
  }
  return files;
}

export function hashAllowlistedFiles(dir) {
  const filesToHash = new Set([...ALLOWLIST_EXACT]);
  
  for (const adir of ALLOWLIST_DIRS) {
    if (existsSync(join(dir, adir))) {
      const children = collectFiles(dir, adir);
      for (const child of children) {
        filesToHash.add(child);
      }
    } else {
      // If the directory itself is missing, we could add it to report it's missing,
      // but usually we care about the exact files.
    }
  }
  
  const results = [];
  
  for (const file of filesToHash) {
    assertSafeRelativePath(file);
    const fullPath = join(dir, file);
    if (!existsSync(fullPath)) {
      results.push({ path: file, missing: true, hash: null });
    } else {
      const content = readFileSync(fullPath);
      const hash = createHash('sha256').update(content).digest('hex');
      results.push({ path: file, missing: false, hash });
    }
  }
  
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

export async function runIsolatedBaseline(worktreeDir) {
  const cwd = process.cwd();
  if (resolve(worktreeDir) === resolve(cwd)) {
    throw new Error('must run in an isolated working directory, not the active repository root');
  }
  // This is a stub for the actual runIsolatedBaseline behavior.
  // It should run npm ci, compile, sync, and return the execution metadata.
}
