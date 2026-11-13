# Phase 2: Offline Data and Persistence - Verification Evidence

## Environment Metadata
- **Commit:** fcfcf00
- **Dirty:** false
- **Observed At:** 2026-09-17T00:43:00Z
- **Platform:** Windows x64
- **Scope:** local-test, local-static

## Verification Commands

### 1. Knowledge Compilation
- **Command:** `npm run compile:knowledge`
- **Scope:** local-static
- **Exit Code:** 0
- **Status:** Passed
- **Result:** Successfully rebuilt `seed.sql`, `classes.json`, and `knowledge.ts`.
- **Generated-artifact diff:** `git diff --check` returned clean (exit code 0), proving compilation is deterministic and leaves no uncommitted drift.

### 2. Typechecking
- **Command:** `npm run typecheck`
- **Scope:** local-static
- **Exit Code:** 0
- **Status:** Passed
- **Result:** Both `app` and `api` typechecks succeeded.

### 3. Automated Test Suite
- **Command:** `npm test`
- **Scope:** local-test
- **Exit Code:** 1
- **Status:** Failed
- **Result:** 
  - Passed 496 tests across 64 suites (including `drain.test.ts`, `scans.test.ts`, `photoStore.test.ts`, `migrate.test.ts`, `seed.test.ts`).
  - Failed 2 tests in `src/features/__tests__/interactions.test.tsx` due to missing mock model integration and history navigation UI changes not yet fully mapped to the new persistence layer.
- **Limitations:** The local test failures block a complete `Passed` status for the overall suite. Furthermore, local tests cannot assert Android-native or isolated-web behavior.

### 4. Network-Body Inspection
- **Scope:** local-test
- **Status:** Passed
- **Evidence:** `src/core/sync/__tests__/drain.test.ts` successfully parses the outgoing `fetch` body and explicitly asserts `expect(body).not.toHaveProperty('image_uri')` and `expect(body).not.toHaveProperty('image_bytes')`. This guarantees the D-13 privacy constraint.

## Limitations and Gaps
- **Android Device Behavior:** The native `expo-file-system` and `expo-sqlite` behavior has not been tested on a physical Android handset in this phase.
- **Isolated Web Runtime:** The web SQLite behavior inside a COOP/COEP isolated context has not been tested via a live Chromium instance.
- **Interactions Test Failures:** The `interactions.test.tsx` suite requires updates in Phase 4 (Flows) to properly render the empty model state and history tab navigation.

## Remediation Rerun — 2026-09-17

### Environment
- **Base HEAD:** `8241fd8`
- **Dirty:** true — this evidence covers the uncommitted Phase 2 remediation requested after independent verification.
- **Scope:** `local-test`, `local-static`

### Corrected implementation gaps
- Startup now reaches `ready` only after SQLite warm-up, open, migrations, and seed loading complete. The prepared driver is passed into the navigator, failed initialization is not cached, and retry follows the same non-destructive path.
- Startup recovery now exposes a real button, bilingual recovery text, and collapsed technical details.
- The two `interactions.test.tsx` regressions are fixed: capture reaches the truthful no-model result and that result exposes a working History action.
- Restored settings and per-scan writes normalize coordinates to two decimals; coarse labels retain at most locality and region.
- Owned-photo filenames use a bounded extension allow-list and fail explicitly when persistent document storage is unavailable.
- Filipino is primary in the fruit-first detail when selected, and disease/remedy source citations remain reachable beside their claims.

### Verification commands
- **`npm run typecheck`** — exit 0; app and API TypeScript checks passed.
- **`npm run compile:knowledge`** — exit 0; generated knowledge outputs rebuilt without drift.
- **`git diff --check`** — exit 0.
- **`npm test`** — exit 0:
  - scripts/baseline: 23 passed;
  - app: 507 passed, 5 skipped, 0 failed;
  - API: 103 passed, 0 failed;
  - total observed: 633 passed, 5 skipped, 0 failed.
- **`npm --prefix app run build:web`** — exit 0; static web export completed.
- **`npm --prefix app exec expo export -- --platform android`** — exit 1; failed with `CommandError: No platforms are configured to use the Metro bundler in the project Expo config.` Android static bundle export is not established.

### Remaining evidence limits
- The app-scoped Android static export failed, and native SQLite/FileSystem behavior on a physical Android handset remains untested.
- Static web export does not prove SQLite behavior in a served, cross-origin-isolated Chromium session.
- The approved production taxonomy still contains no reviewed disease/remedy rows, so FLOW-03 remains blocked for actual disease/remedy guidance.
