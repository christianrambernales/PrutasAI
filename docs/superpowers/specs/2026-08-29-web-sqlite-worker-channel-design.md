# PrutasAI Web SQLite Worker Channel Fix — Design Spec

**Date:** 2026-08-29
**Status:** Approved
**Scope:** Web platform startup (dependency patch, error boundary, dev-server scripts)

---

## 1. Overview

The web build renders a blank white page. This spec fixes the cause, adds a
visible failure path for the next one, and restores the `npm start` behaviour a
previous session changed.

The cause is **not** either of the two faults recorded in
`docs/HANDOFF-2026-08-17.md` §3. Both of those fixes are intact and verified
working. This is a third, previously undocumented fault, and it lives in a
dependency.

### Objectives

1. Fix truncated synchronous SQLite results on web by patching `expo-sqlite`.
2. Fix the latent oversize-payload bug in the same code path.
3. Add a React error boundary so a render-time crash shows a message, never a
   blank page.
4. Restore `npm start` to the Expo dev server; keep the web proxy on `npm run web`.

---

## 2. Root Cause

### 2.1 Evidence

Measured on 2026-08-29 against `npm start`, driving headless Edge over the
Chrome DevTools Protocol in real time (not `--virtual-time-budget`, which
HANDOFF §6.3 records as producing false timeouts on this class of bug):

```
crossOriginIsolated : true
SharedArrayBuffer   : function
#root children      : 0
COOP/COEP headers   : present on the document

SyntaxError: Unexpected end of JSON input
    at JSON.parse
    at deserialize
    at invokeWorkerSync
    at NativeStatement.getAllSync
    at SQLiteExecuteSyncResultImpl.getAllSync
```

Cross-origin isolation is working, so **Fault 1 is dead**. There is no "Sync
operation timeout", so **Fault 2 is dead**. This is a different failure.

### 2.2 The defect

`expo-sqlite@16.0.10/web/WorkerChannel.ts` returns synchronous query results
through a `SharedArrayBuffer` framed as a 4-byte little-endian length followed
by UTF-8 JSON.

The worker writes that length at line 43:

```ts
const resultArray = new Uint8Array(resultBuffer);
// ...
resultArray.set(new Uint32Array([length]), 0);   // BUG
```

`Uint8Array.prototype.set`, given a source typed array of a *different* type,
converts **element-wise** rather than copying bytes. The one-element
`Uint32Array` therefore writes a single byte — `length & 0xFF` — into offset 0,
leaving bytes 1 through 3 as zero.

The main thread reads all four bytes back as a `Uint32` at line 140:

```ts
const length = new Uint32Array(resultArray.buffer, 0, 1)[0];
```

So the reader recovers `length % 256`, not `length`. Demonstrated in isolation:

```
length = 5000  ->  bytes written [136, 0, 0, 0]  ->  read back 136
```

**Any synchronous result whose serialized JSON exceeds 255 bytes is truncated**,
and `JSON.parse` throws on the fragment. When `length % 256 === 0` the decoded
string is empty, producing the same error.

### 2.3 Why it appeared only now

Results under 256 bytes round-trip correctly, because `length & 0xFF === length`.
That covers `exec` (which returns `null`), schema migrations, seeding, and
single-row lookups such as `hasConsented`. It is why the 08-17 verification
reached the consent screen and why every prior session believed web worked.

Task 3 of `docs/superpowers/plans/2026-08-28-code-review-improvements.md` wired
`listFruits`, `listAllVarietiesByFruit`, `listSourcesByFruit`, and
`listScanGroups` into `AppNavigator`'s first render. Those return multi-kilobyte
payloads. A latent upstream bug became a hard crash.

### 2.4 Confirmed by falsification

Replacing line 43 with `new Uint32Array(resultBuffer, 0, 1)[0] = length;` in
`node_modules` and re-probing produced:

```
#root children : 1
body text      : "What PrutasAI sends / Sent / ... / Got it"
exceptions     : 0
```

The change was then reverted, so the repository starts from the broken state.

### 2.5 No upgrade path

The identical defect is present in the newest published canary
(`expo-sqlite@16.1.0-canary-20260121-a63c0dd`). Upgrading does not fix it.
`web/WorkerChannel.ts` ships as raw TypeScript compiled by Metro, with no
`build/` duplicate, so it is a single-file patch target.

---

## 3. Design

### 3.1 Patch the dependency

`vercel.json`'s `installCommand` runs `npm --prefix app install`, so the patch
must be applied by a lifecycle script in **`app/package.json`**, not the root.

- Add `patch-package` to `app/devDependencies`.
- Add `"postinstall": "patch-package"` to `app/package.json` scripts.
- Commit `app/patches/expo-sqlite+16.0.10.patch`.

`.gitignore` ignores `node_modules/` but not `patches/`, so the patch file
commits without a gitignore change.

Two edits to `node_modules/expo-sqlite/web/WorkerChannel.ts`:

**Edit 1 — the length prefix (line 43).**

```ts
// Before
resultArray.set(new Uint32Array([length]), 0);

// After
new Uint32Array(resultBuffer, 0, 1)[0] = length;
```

Writing through the same view type the reader uses makes endianness agree by
construction rather than by assumption.

**Edit 2 — the missing bounds check.**

`resultBuffer` is a fixed `1024 * 1024` byte `SharedArrayBuffer` (line 106), so
the usable payload is `byteLength - 4`. Upstream never checks it. A payload over
that size makes `resultArray.set(resultBytes, 4)` throw a `RangeError` *inside
the worker*, so `Atomics.store(lock, 0, RESOLVED)` is never reached and the main
thread spins until it reports "Sync operation timeout" — a misleading error for
what is really "result too large".

Before writing, if `length > resultBuffer.byteLength - 4`, serialize an `{ error }`
payload naming the actual and maximum sizes and store `RESOLVED`. The main thread
already rethrows a returned `error`, so this surfaces as an accurate exception.

This is a second, independent bug in the same six lines. Fixing only the first
would leave a 1 MiB cliff in place.

**Version pinning.** `patch-package` keys the patch to `expo-sqlite+16.0.10`. A
version bump makes it fail loudly rather than silently reverting to broken
behaviour. This is intended: a bump must be a deliberate re-verification, since
the upstream defect is still unfixed.

### 3.2 Guard test

Create `app/src/core/db/__tests__/workerChannelPatch.test.ts` with two tests:

1. **Patch presence.** Read the installed
   `node_modules/expo-sqlite/web/WorkerChannel.ts` and assert the fixed writer is
   present and the buggy `resultArray.set(new Uint32Array(` line is absent. Blunt,
   but it targets the exact failure mode that would otherwise reach a browser
   unnoticed: a reinstall or upgrade that quietly drops the patch.

2. **Framing round-trip.** A pure unit test that replicates the write-then-read
   framing and asserts a payload well over 255 bytes survives intact, plus the
   `length % 256 === 0` boundary. This proves the property that was broken, and
   fails against the old code.

### 3.3 Error boundary

Create an error boundary component in `app/src/ui` (a class component, since
`getDerivedStateFromError` has no hook equivalent) and export it from
`app/src/ui/index.ts`. Wrap `<AppNavigator />` with it in `app/App.tsx`.

The existing `App.tsx` startup gate **cannot** catch this class of failure: it
awaits `prepareAppDatabase()`, while the throw happens later, during
`AppNavigator`'s render. React logged "Consider adding an error boundary to your
tree" on the failing run.

Reuse the existing `startupFailedTitle` and `startupFailedBody` dictionary keys
and render the raw error message beneath them, matching the current `Startup`
screen. No new i18n keys are required. Like `Startup`, the boundary sits outside
`LanguageProvider`, so it renders in the dictionary's English default — the same
accepted behaviour documented in HANDOFF §6.9.

Use existing tokens only: `COLORS.error`, `COLORS.textSecondary`,
`COLORS.textLight`, `COLORS.surface`, `SPACING.*`, and `AppText` variants that
exist (there is no `lgSemi`).

Add a test mounting a child that throws, asserting the fallback renders and the
message is shown.

### 3.4 Restore `npm start`

`app/package.json` currently reads `"start": "node scripts/start-web.mjs"`, so
`npm start` serves a web-only proxy with no QR code and no Android or iOS. HANDOFF
§4 states Android is the source of truth for this thesis.

```json
"start": "expo start",
"web": "node scripts/start-web.mjs"
```

Remove the now-redundant `start:expo`. The root `package.json` keeps both
`"start": "npm --prefix app start"` and `"start:web": "npm --prefix app run web"`,
so the proxied web path stays one command away.

---

## 4. Verification Plan

Each step is a pass/fail gate. Steps 3 and 4 are the ones prior sessions skipped.

1. **Unit and guard tests.** `npm test` at root — script, app, and api suites.
   The app baseline is 295 passed / 5 skipped; the new tests add to it. No
   regressions.
2. **Types.** `npm run typecheck` at root (app and api). Zero errors.
3. **Clean-install reapply.** Delete `app/node_modules`, run
   `npm --prefix app install`, and confirm the patch is present in the installed
   file. Proves `postinstall` actually fires — the assumption the whole approach
   rests on.
4. **Browser end-to-end.** Start the dev server, drive headless Edge over CDP in
   real time, and assert **all** of: `crossOriginIsolated === true`,
   `typeof SharedArrayBuffer === 'function'`, `#root` child count `=== 1`,
   consent copy present in `body.innerText`, and **zero** `Runtime.exceptionThrown`.
   A visual check alone is not acceptable.
5. **Production build path.** `npm --prefix app run build:web` succeeds, matching
   what `vercel.json`'s `buildCommand` runs. Per HANDOFF §6.4, `expo export` can
   print `EBUSY: rmdir dist` and still exit 0 — confirm the emitted bundle hash
   changed rather than trusting the exit code.
6. **Android untouched.** `npm start` launches the Expo dev server and prints a
   QR code. `npx expo export --platform android` still emits its baseline module
   count.

---

## 5. Out of Scope

- **The 1 MiB result ceiling.** After edit 2 it is an honest, accurate error
  rather than a bogus timeout. Raising it needs a chunking protocol — a separate
  design, and unnecessary at this app's row counts.
- **Migrating web to async SQLite.** Considered and rejected: it touches every
  repository, screen, and test to work around a two-line upstream defect.
- **The Gemini model fallback.** `api/v1/assistant.ts:20` already uses
  `gemini-3.6-flash`, which is correct. No change.
- **`app/metro-coi-headers.js`** (dead code, HANDOFF §5.3a) and **`scratch.cjs`**
  at the repo root. Unrelated cleanup; the user has previously declined deletions.
- **Deployment.** HANDOFF §3 records a standing instruction: fix, then the user
  checks, and only then deploy.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| `postinstall` does not fire on Vercel | Verification step 3 proves reapply from a clean tree; step 5 runs the real build command |
| An `expo-sqlite` bump silently drops the patch | Version-pinned patch filename fails the install; guard test fails the suite |
| `patch-package` interferes with `expo prebuild` / EAS | Patch touches only `web/`, which Android never loads; verification step 6 confirms the Android export |
| The fix is correct but something else also breaks web | Step 4 asserts zero exceptions, not merely that something rendered |

---

## 7. Upstream

The defect affects every Expo SDK 54 web app using synchronous `expo-sqlite`,
and is unfixed on `main` as of `16.1.0-canary-20260121-a63c0dd`. Report it to
`expo/expo` with the isolated reproduction from §2.2. Not a blocker for this work.
