# Web SQLite Worker Channel Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the web build rendering a blank white page, by patching a length-prefix bug in `expo-sqlite` that truncates any synchronous SQLite result over 255 bytes.

**Architecture:** The fix is a version-pinned `patch-package` patch against `expo-sqlite@16.0.10`'s `web/WorkerChannel.ts`, applied by a `postinstall` script in `app/package.json`. Two supporting changes ride along: a React error boundary so the next render-time crash shows a message instead of a blank page, and a revert of a previous session's change that repointed `npm start` at the web proxy.

**Tech Stack:** TypeScript 5.9, React 19.1, React Native 0.81.5, Expo SDK 54, `expo-sqlite` 16.0.10, Jest 29 + `jest-expo` 54, `patch-package`.

**Spec:** `C:\Users\chris\OneDrive\Documents\PROG\THESIS\PrustasAI\docs\superpowers\specs\2026-08-29-web-sqlite-worker-channel-design.md`

## Global Constraints

- The patch MUST be declared in `app/package.json`, never the root. `vercel.json`'s `installCommand` is `npm install && npm --prefix app install && npm --prefix api install`, so only a lifecycle script inside `app/` runs where `expo-sqlite` is installed.
- The patch filename MUST stay version-pinned as `expo-sqlite+16.0.10.patch`. A version bump must fail loudly; the upstream defect is unfixed as of `16.1.0-canary-20260121-a63c0dd`.
- Every user-facing string MUST exist in **both** EN and FIL in `app/src/ui/i18n/strings.ts`; the `Dictionary` type enforces it. This plan adds **no** new strings — it reuses `startupFailedTitle` and `startupFailedBody`.
- The UI has **zero** third-party dependencies. Use `app/src/ui` only. Real token names: `COLORS.text`, `COLORS.error`, `COLORS.textSecondary`, `COLORS.textLight`, `COLORS.surface`, `COLORS.primary`; `SPACING.xs|sm|md|lg|xl|xxl`; `AppText` variants `hero|title|xxl|xl|lg|md|mdSemi|sm|smSemi|xs|xsSemi` — there is **no** `lgSemi`.
- Do **not** modify `app/src/navigation/AppNavigator.tsx`. Five test files mount it; it is not the site of this fix.
- Do **not** delete `app/metro-coi-headers.js` or `scratch.cjs`. The user has previously declined those deletions.
- Do **not** deploy. A standing instruction requires the user to check the app first.
- App test baseline is **295 passed / 5 skipped**, 33 suites passed / 2 skipped. New tests add to that count; nothing may regress.

---

### Task 1: Patch the expo-sqlite worker channel

**Files:**
- Modify: `app/package.json` (add `patch-package` devDependency, add `postinstall` script)
- Modify: `app/node_modules/expo-sqlite/web/WorkerChannel.ts:42-44` (source of the generated patch; not committed directly)
- Create: `app/patches/expo-sqlite+16.0.10.patch` (generated)
- Create: `app/src/core/db/__tests__/workerChannelPatch.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks. This is the first task.
- Produces: a working synchronous SQLite read path on web for results of any size up to 1 MiB. No new exported symbols — later tasks do not import from here.

**Background you need.** `expo-sqlite` runs SQLite in a Web Worker on web. Synchronous calls (`getAllSync`, `getFirstSync`, `execSync`) return results through a `SharedArrayBuffer` framed as a 4-byte little-endian length followed by UTF-8 JSON. The worker writes that length with `resultArray.set(new Uint32Array([length]), 0)`, where `resultArray` is a `Uint8Array`. `Uint8Array.prototype.set` given a differently-typed source converts **element-wise**, so this writes one byte — `length & 0xFF` — and leaves bytes 1-3 zero. The reader takes all four bytes as a `Uint32`, recovering `length % 256`. Any result over 255 bytes is truncated and `JSON.parse` throws `SyntaxError: Unexpected end of JSON input`.

- [ ] **Step 1: Add patch-package and the postinstall hook**

Run:
```bash
npm --prefix app install --save-dev patch-package
```

Then add the `postinstall` script to `app/package.json`. The scripts block currently reads:

```json
  "scripts": {
    "start": "node scripts/start-web.mjs",
    "start:expo": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "node scripts/start-web.mjs",
    "build:web": "expo export --platform web",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
```

Add one line so it becomes:

```json
  "scripts": {
    "postinstall": "patch-package",
    "start": "node scripts/start-web.mjs",
    "start:expo": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "node scripts/start-web.mjs",
    "build:web": "expo export --platform web",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
```

Leave the `start` scripts alone here — Task 3 changes them. Changing them now would make Task 3's diff confusing.

`patch-package` with no `patches/` directory prints "No patch files found" and exits 0, so this is safe before the patch exists.

- [ ] **Step 2: Write the failing test**

Create `app/src/core/db/__tests__/workerChannelPatch.test.ts`:

```typescript
/**
 * expo-sqlite@16.0.10 frames synchronous worker results as a 4-byte
 * little-endian length followed by UTF-8 JSON, but writes that length with
 * `Uint8Array.prototype.set(new Uint32Array([length]))`. Given a source typed
 * array of a different type, `set` converts element-wise rather than copying
 * bytes, so only `length & 0xFF` is stored. The reader takes all four bytes as
 * a Uint32 and recovers `length % 256`.
 *
 * Every synchronous result over 255 bytes was therefore truncated, and
 * `JSON.parse` threw on the fragment. That is what painted the web build white:
 * `listFruits` and its neighbours return multi-kilobyte payloads during
 * AppNavigator's first render.
 *
 * `patches/expo-sqlite+16.0.10.patch` fixes it. These tests exist because a
 * reinstall or version bump that silently drops the patch would otherwise be
 * caught only by opening a browser.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CHANNEL_PATH = join(__dirname, '../../../../node_modules/expo-sqlite/web/WorkerChannel.ts');
const HEADER_BYTES = 4;

describe('the expo-sqlite patch is applied', () => {
  const source = readFileSync(CHANNEL_PATH, 'utf8');

  test('the length prefix is written through a Uint32Array view', () => {
    expect(source).toContain('new Uint32Array(resultBuffer, 0, 1)[0] = length;');
  });

  test('the element-wise write that truncated the length is gone', () => {
    expect(source).not.toContain('resultArray.set(new Uint32Array([length]), 0)');
  });

  test('an oversized result is refused rather than left to time out', () => {
    expect(source).toContain('resultBuffer.byteLength - 4');
  });
});

/**
 * Characterisation of the framing itself, independent of the package. These
 * document the property that was broken and pin the endianness assumption: the
 * writer and reader use the same view type, so they agree by construction.
 */
describe('length-prefixed framing', () => {
  function write(buffer: ArrayBuffer, json: string): void {
    const bytes = new TextEncoder().encode(json);
    new Uint32Array(buffer, 0, 1)[0] = bytes.length;
    new Uint8Array(buffer).set(bytes, HEADER_BYTES);
  }

  function read(buffer: ArrayBuffer): string {
    const length = new Uint32Array(buffer, 0, 1)[0];
    const copy = new Uint8Array(length);
    copy.set(new Uint8Array(buffer, HEADER_BYTES, length));
    return new TextDecoder().decode(copy);
  }

  test('a payload far over 255 bytes survives intact', () => {
    const buffer = new ArrayBuffer(64 * 1024);
    const json = JSON.stringify({
      rows: Array.from({ length: 200 }, (_, i) => ({ id: i, name: `fruit-${i}` })),
    });
    expect(json.length).toBeGreaterThan(255);
    write(buffer, json);
    expect(read(buffer)).toBe(json);
  });

  test('a payload whose length is an exact multiple of 256 survives', () => {
    const buffer = new ArrayBuffer(64 * 1024);
    const json = `"${'x'.repeat(512 - 2)}"`;
    expect(json.length % 256).toBe(0);
    write(buffer, json);
    expect(read(buffer)).toBe(json);
  });

  test('the upstream element-wise write stores only the low byte', () => {
    const buffer = new ArrayBuffer(1024);
    new Uint8Array(buffer).set(new Uint32Array([5000]), 0);
    expect(new Uint32Array(buffer, 0, 1)[0]).toBe(5000 & 0xff);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm --prefix app test -- workerChannelPatch`

Expected: the three `the expo-sqlite patch is applied` tests **FAIL** (the installed file still has the buggy line). The four `length-prefixed framing` tests **PASS** — they characterise the mechanism rather than the package, and the last one asserts the bug exists.

- [ ] **Step 4: Edit the installed package**

Open `app/node_modules/expo-sqlite/web/WorkerChannel.ts`. Inside `sendWorkerResult`, the `if (syncTrait) {` branch currently reads:

```typescript
  if (syncTrait) {
    const { lockBuffer, resultBuffer } = syncTrait;
    const lock = new Int32Array(lockBuffer);
    const resultArray = new Uint8Array(resultBuffer);
    const resultJson = error != null ? serialize({ error }) : serialize({ result });
    const resultBytes = new TextEncoder().encode(resultJson);
    const length = resultBytes.length;
    resultArray.set(new Uint32Array([length]), 0);
    resultArray.set(resultBytes, 4);
    Atomics.store(lock, 0, RESOLVED);
  } else {
```

Replace that branch with:

```typescript
  if (syncTrait) {
    const { lockBuffer, resultBuffer } = syncTrait;
    const lock = new Int32Array(lockBuffer);
    const resultArray = new Uint8Array(resultBuffer);
    const resultJson = error != null ? serialize({ error }) : serialize({ result });
    const resultBytes = new TextEncoder().encode(resultJson);
    const length = resultBytes.length;
    // The result buffer is a fixed 1 MiB SharedArrayBuffer with a 4-byte length
    // header. Without this check an oversized payload makes the `set` below
    // throw *inside the worker*, so RESOLVED is never stored and the main
    // thread busy-waits until it reports "Sync operation timeout" — which
    // blames the wrong thing. Report the real problem instead.
    const maxBytes = resultBuffer.byteLength - 4;
    if (length > maxBytes) {
      const overflowBytes = new TextEncoder().encode(
        serialize({
          error: `SQLite result too large for the sync channel: ${length} bytes, maximum ${maxBytes}.`,
        })
      );
      new Uint32Array(resultBuffer, 0, 1)[0] = overflowBytes.length;
      resultArray.set(overflowBytes, 4);
      Atomics.store(lock, 0, RESOLVED);
      return;
    }
    // `resultArray.set(new Uint32Array([length]), 0)` was the bug: `set` given a
    // differently-typed source converts element-wise, storing only length & 0xFF.
    // Writing through the same view type the reader uses also makes endianness
    // agree by construction rather than by assumption.
    new Uint32Array(resultBuffer, 0, 1)[0] = length;
    resultArray.set(resultBytes, 4);
    Atomics.store(lock, 0, RESOLVED);
  } else {
```

- [ ] **Step 5: Generate the patch file**

Run:
```bash
cd app && npx patch-package expo-sqlite
```

Expected: creates `app/patches/expo-sqlite+16.0.10.patch`. Confirm the filename carries `16.0.10` — if it does not, stop: the installed version is not what this plan assumes.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm --prefix app test -- workerChannelPatch`

Expected: all 7 tests PASS.

- [ ] **Step 7: Prove the patch reapplies from a clean tree**

This is the assumption the whole approach rests on. Do not skip it.

```bash
rm -rf app/node_modules
npm --prefix app install
grep -c "new Uint32Array(resultBuffer, 0, 1)\[0\] = length;" app/node_modules/expo-sqlite/web/WorkerChannel.ts
```

Expected: `patch-package` prints that it applied `expo-sqlite@16.0.10`, and the `grep -c` prints `1`.

- [ ] **Step 8: Run the full app suite**

Run: `npm --prefix app test`

Expected: PASS, with 7 more tests than the 295-passed baseline and no suite regressions.

- [ ] **Step 9: Commit**

```bash
git add app/package.json app/package-lock.json app/patches/expo-sqlite+16.0.10.patch app/src/core/db/__tests__/workerChannelPatch.test.ts
git commit -m "fix: patch expo-sqlite sync worker channel length prefix

Uint8Array.set(Uint32Array) converts element-wise, so the worker stored
only length & 0xFF and every synchronous result over 255 bytes came back
truncated. Also refuses an oversized payload instead of letting the main
thread blame a sync timeout."
```

---

### Task 2: Error boundary around AppNavigator

**Files:**
- Create: `app/src/ui/components/ErrorBoundary.tsx`
- Modify: `app/src/ui/index.ts` (add the export)
- Modify: `app/App.tsx` (wrap `<AppNavigator />`)
- Create: `app/src/ui/__tests__/errorBoundary.test.tsx`

**Interfaces:**
- Consumes: `AppText` from `app/src/ui/components/primitives`; `COLORS`, `SPACING` from `app/src/ui/tokens`; `useT` from `app/src/ui/i18n/LanguageContext`; the existing `startupFailedTitle` and `startupFailedBody` dictionary keys.
- Produces: `ErrorBoundary`, a React class component exported from `app/src/ui`. Props: `{ children: React.ReactNode }`. Renders its children normally; on a thrown render error, renders a fallback showing the title, body, and the raw error message.

**Why this cannot be done with the existing gate.** `App.tsx` already awaits `prepareAppDatabase()` and shows a real error if that rejects. It cannot catch Task 1's class of failure, because the throw happens later — synchronously, during `AppNavigator`'s render. React logged "An error occurred in the `<AppNavigator>` component. Consider adding an error boundary to your tree" on the failing run. `getDerivedStateFromError` has no hook equivalent, so this must be a class component.

- [ ] **Step 1: Write the failing test**

Create `app/src/ui/__tests__/errorBoundary.test.tsx`:

```typescript
/**
 * A render-time throw used to unmount the whole tree and leave a white page.
 * The startup gate in App.tsx cannot catch it — that only awaits the database
 * warm-up, and this kind of error is thrown later, during render.
 */

import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppText } from '../components/primitives';

function renderedText(tree: renderer.ReactTestRenderer): string {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      found.push(node);
      return;
    }
    if (Array.isArray(node)) node.forEach(walk);
  };
  tree.root.findAllByType(AppText).forEach(node => walk(node.props.children));
  return found.join(' ');
}

function Boom(): React.ReactElement {
  throw new Error('database exploded');
}

// React logs the caught error to console.error by design. Silence it so a
// passing test does not read like a failing one.
let consoleError: jest.SpyInstance;
beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
});

test('children render untouched when nothing throws', () => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ErrorBoundary>
        <AppText>all is well</AppText>
      </ErrorBoundary>,
    );
  });
  expect(renderedText(tree)).toContain('all is well');
});

test('a render-time throw shows the failure instead of nothing', () => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
  });
  const text = renderedText(tree);
  expect(text).toContain('The app could not open its database');
  expect(text).toContain('database exploded');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix app test -- errorBoundary`

Expected: FAIL — `Cannot find module '../components/ErrorBoundary'`.

- [ ] **Step 3: Write minimal implementation**

Create `app/src/ui/components/ErrorBoundary.tsx`:

```typescript
import React from 'react';
import { View } from 'react-native';

import { AppText } from './primitives';
import { COLORS, SPACING } from '../tokens';
import { useT } from '../i18n/LanguageContext';

interface Props {
  children: React.ReactNode;
}

interface State {
  detail: string | null;
}

/**
 * Catches a throw during render and shows it.
 *
 * `App.tsx`'s startup gate handles a failed database warm-up, but it cannot
 * reach an exception raised later, while `AppNavigator` renders. React unmounts
 * the tree for those, which is exactly the blank white page this project treats
 * as a defect rather than a cosmetic problem.
 *
 * A class, because `getDerivedStateFromError` has no hook equivalent.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { detail: null };

  static getDerivedStateFromError(error: unknown): State {
    return { detail: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.detail === null) return this.props.children;
    return <ErrorFallback detail={this.state.detail} />;
  }
}

/**
 * Split out so it can use the dictionary hook, which a class cannot call.
 *
 * This sits outside `LanguageProvider` — it wraps the navigator that contains
 * it — so it renders in the dictionary's English default, the same accepted
 * behaviour as the startup screen in `App.tsx`.
 */
function ErrorFallback({ detail }: { detail: string }) {
  const t = useT();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.surface,
      }}
    >
      <AppText variant="lg" color={COLORS.error} center>
        {t.startupFailedTitle}
      </AppText>
      <AppText variant="sm" color={COLORS.textSecondary} center style={{ marginTop: SPACING.sm }}>
        {t.startupFailedBody}
      </AppText>
      {/* The raw message. Unreadable to a grower, but it is the difference
          between a bug report that can be acted on and "it went white". */}
      <AppText variant="xs" color={COLORS.textLight} center style={{ marginTop: SPACING.lg }}>
        {detail}
      </AppText>
    </View>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix app test -- errorBoundary`

Expected: PASS, 2 tests.

- [ ] **Step 5: Export it from the ui barrel**

In `app/src/ui/index.ts`, add one line directly after the primitives export block (the one ending `} from './components/primitives';`) and before the controls line:

```typescript
export { ErrorBoundary } from './components/ErrorBoundary';
```

- [ ] **Step 6: Wrap AppNavigator in App.tsx**

In `app/App.tsx`, change the import line

```typescript
import { AppText, COLORS, SPACING, useT } from './src/ui';
```

to

```typescript
import { AppText, COLORS, ErrorBoundary, SPACING, useT } from './src/ui';
```

and change

```typescript
      {startup.status === 'ready' ? <AppNavigator /> : <Startup startup={startup} />}
```

to

```typescript
      {startup.status === 'ready' ? (
        <ErrorBoundary>
          <AppNavigator />
        </ErrorBoundary>
      ) : (
        <Startup startup={startup} />
      )}
```

- [ ] **Step 7: Run typecheck and the full suite**

Run: `npm --prefix app run typecheck && npm --prefix app test`

Expected: 0 type errors; all tests pass. No test imports `App.tsx`, so the five suites that mount `AppNavigator` are unaffected.

- [ ] **Step 8: Commit**

```bash
git add app/src/ui/components/ErrorBoundary.tsx app/src/ui/index.ts app/App.tsx app/src/ui/__tests__/errorBoundary.test.tsx
git commit -m "feat: show render-time crashes instead of a white page

The startup gate only covers a failed database warm-up. An exception
raised while AppNavigator renders unmounted the tree and told the user
nothing, which is how the sqlite truncation bug presented."
```

---

### Task 3: Restore `npm start` to the Expo dev server

**Files:**
- Modify: `app/package.json` (scripts block)

**Interfaces:**
- Consumes: nothing. Independent of Tasks 1 and 2.
- Produces: `npm start` at the repo root launches Expo with a QR code; `npm run start:web` at the root still launches the cross-origin-isolated web proxy.

**Why.** A previous session repointed `"start"` at `scripts/start-web.mjs` to satisfy "I want to run just using npm start". That made `npm start` web-only — no QR code, no Android, no iOS. Android is the source of truth for this thesis; browser preview is for layout and copy. With Task 1 landed, the web path works properly on its own script, so `start` goes back to what its name means.

- [ ] **Step 1: Edit the scripts block**

In `app/package.json`, the scripts block reads (after Task 1 added `postinstall`):

```json
  "scripts": {
    "postinstall": "patch-package",
    "start": "node scripts/start-web.mjs",
    "start:expo": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "node scripts/start-web.mjs",
    "build:web": "expo export --platform web",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
```

Change it to:

```json
  "scripts": {
    "postinstall": "patch-package",
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "node scripts/start-web.mjs",
    "build:web": "expo export --platform web",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
```

Two changes: `start` becomes `expo start`, and the now-redundant `start:expo` is removed.

Do **not** touch the root `package.json`. It already has both `"start": "npm --prefix app start"` and `"start:web": "npm --prefix app run web"`, which now mean the right things.

- [ ] **Step 2: Verify no script references the removed name**

Run: `grep -rn "start:expo" --include=*.json --include=*.md --include=*.mjs --include=*.js . | grep -v node_modules`

Expected: no matches outside `docs/` history files, which record what past sessions did and are left as-is. If a match appears in `README.md` or `docs/BUILDING.md`, update that line to `npm start`.

- [ ] **Step 3: Commit**

```bash
git add app/package.json
git commit -m "fix: npm start runs the expo dev server again

It had been repointed at the web proxy, which left no QR code and no
android target. Web keeps its own script."
```

---

### Task 4: Full verification (run by the orchestrator, not a subagent)

**Files:** none modified. This task only runs gates.

**Interfaces:**
- Consumes: everything from Tasks 1-3.
- Produces: a pass/fail verdict on each of the spec's six verification gates.

This task needs a real browser and a running dev server, so it is run in the main session rather than delegated. Every prior session's failure was declaring success without gate 3.

- [ ] **Step 1: Tests and types across the repo**

```bash
npm test && npm run typecheck
```

Expected: script, app, and api suites pass; 0 type errors in app and api.

- [ ] **Step 2: Clean-install reapply**

```bash
rm -rf app/node_modules && npm --prefix app install
grep -c "new Uint32Array(resultBuffer, 0, 1)\[0\] = length;" app/node_modules/expo-sqlite/web/WorkerChannel.ts
```

Expected: `1`. Proves `postinstall` fires — which is what Vercel's `npm --prefix app install` will rely on.

- [ ] **Step 3: Browser end-to-end**

Start the web dev server:

```bash
npm run start:web
```

Then drive headless Edge over the Chrome DevTools Protocol against the printed URL (default `http://localhost:8081`) and assert **all five** of:

- `crossOriginIsolated === true`
- `typeof SharedArrayBuffer === 'function'`
- `document.getElementById('root').children.length === 1`
- `document.body.innerText` contains `What PrutasAI sends` and `Got it`
- **zero** `Runtime.exceptionThrown` events

Technique notes, so this is not rediscovered: Chrome is not installed on this machine — use Edge at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe` with `--headless=new --remote-debugging-port=9222`. `PUT /json/new` to get a target, connect to `webSocketDebuggerUrl` (Node 24 has a global `WebSocket`), enable `Runtime` and `Page`, navigate, then **wait in real time** before evaluating. Do **not** use `--virtual-time-budget`: it fast-forwards timers past real network fetches and fabricates a false "Sync operation timeout" on exactly this bug. Capture `Runtime.exceptionThrown` as well as `Runtime.consoleAPICalled` — the useful error appears only in the former.

A visual check is not an acceptable substitute. Stop the dev server when done.

- [ ] **Step 4: Production build path**

```bash
npm --prefix app run build:web
```

Expected: succeeds. `expo export` can print `EBUSY: rmdir dist` and still exit 0, so confirm the emitted bundle hash actually changed rather than trusting the exit code. This is the command `vercel.json`'s `buildCommand` runs.

- [ ] **Step 5: Android untouched**

```bash
npm start
```

Expected: the Expo dev server starts and prints a QR code. Stop it, then:

```bash
npm --prefix app exec -- expo export --platform android
```

Expected: succeeds at roughly the 720-module baseline.

- [ ] **Step 6: Report**

Report each gate's actual result — including anything that failed. Do not summarise a skipped gate as passed.

---

## Notes for the executor

- **Do not commit anything beyond the files each task lists.** The working tree carries ~48 untracked and ~29 modified files of unrelated platform/accounts work that the user has not decided about. Stage by explicit path, never `git add -A` or `git add .`.
- **Do not add a `Co-Authored-By` trailer.** The project's `CLAUDE.md` forbids it unless `.claude/settings.json` sets `attribution.commit`, and it does not.
- **A `GateGuard` hook** intercepts the first `Bash` call and every first-touch `Edit`/`Write`, demanding stated facts before proceeding. It also trips on the literal string `rm -rf` anywhere in a command. State the facts and retry; do not route around it.
- **Report failures as failures.** Two prior sessions declared this bug fixed while it was not. If a gate fails, say so with the output.
