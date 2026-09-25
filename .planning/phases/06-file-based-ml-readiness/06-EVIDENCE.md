# Phase 6 Evidence Ledger

**Observed:** 2026-09-25 UTC  
**Plan:** 06-05  
**Evidence boundary:** Local code, test, typecheck, and static build observations only. No owner-supplied model, browser runtime, Android device, deployed service, or inference was verified.

## Checkout and Environment Snapshot

| Property | Observed value |
|---|---|
| Git commit | `5093b931de3785f1f9be6351f677ef0aa8f0e33f` |
| Branch | `Thesis_2_Prototype` |
| Working tree | Dirty at every run; pre-existing edits span application and planning files. The Phase 6 contract/sync source and focused model tests were clean at the start. |
| Node / npm | `v24.16.0` / `12.0.2` |
| Host | Windows 10, Node platform `win32`, architecture `x64` |
| Python | `3.11.9`; pinned `ai-edge-litert` is not installed; Python 3.12 and the `py` launcher were unavailable. |
| Android build tools | `ANDROID_HOME` and `ANDROID_SDK_ROOT` unset; `adb` unavailable; `app/android` absent. Java is on PATH. |
| Source model state | `models/manifest.json` has 0 models; `models/approval.json` has 0 approval records; source and generated model directories contain 0 `.tflite` files. |

All local records below use commit `5093b931de3785f1f9be6351f677ef0aa8f0e33f`, dirty working tree `true`, Node `v24.16.0`, npm `12.0.2`, Windows `win32/x64`. The full-suite failure occurred in the active dirty checkout; it is recorded as observed and is not suppressed by the focused Phase 6 passes.

## Command Results

| Evidence ID | UTC observation | Scope | Exact command or check | Verdict / exit | Result |
|---|---|---|---|---|---|
| `06-05-local-test-contract-sync` | 05:43:40–05:43:41 | `local-test` | `node --test scripts/model-contract.test.mjs scripts/sync-models.test.mjs` | **Passed / 0** | 39 tests passed, 0 failed. Includes manifest/approval rejection, empty-model behavior, injected-inspector transaction, and preservation cases below. |
| `06-05-local-test-status-ui` | 05:43:40–05:43:46 | `local-test` | `npm --prefix app test -- --runInBand src/core/ml/__tests__/registry.test.ts src/core/status/__tests__/status.test.ts src/navigation/__tests__/render.test.tsx src/features/modelStatus/__tests__/ModelStatusView.test.tsx src/features/modelStatus/__tests__/ModelStatusRoute.test.tsx src/features/__tests__/interactions.test.tsx src/features/__tests__/screens.test.tsx` | **Passed / 0** | 7 suites and 102 tests passed. Expo emitted a test-environment warning that `process.env.EXPO_OS` was not defined; no assertion failed. |
| `06-05-local-static-typecheck` | 05:43:56–05:44:04 | `local-static` | `npm run typecheck` | **Passed / 0** | Root app and API TypeScript checks completed. |
| `06-05-local-test-root-suite` | 05:44:11–05:44:23 | `local-test` | `npm test` | **Failed / 1** | Script/baseline phases completed; app Jest reported 89 suites passed, 2 skipped, 1 failed (92 total), with 764 tests passed, 5 skipped, 1 failed (770 total). Failure: `src/features/__tests__/language.test.tsx`, “no Filipino string was left as its English original”; actual untranslated list includes `fruitPapaya` beyond the seven expected keys. The root script uses `&&`, so this run stopped before its API phase. |
| `06-05-local-test-api` | 05:45:45–05:45:49 | `local-test` | `npm --prefix api test` | **Passed / 0** | Separate API run passed all 10 files and 157 tests. This does not change the failed root-suite verdict. |
| `06-05-empty-sync-repeat` | 05:46:29–05:46:30 | `local-static` | `npm run sync:models` run twice; hash the three generated ML metadata files and the recursive `app/assets/models` tree after each run | **Passed / 0, 0** | Both runs reported `bundled 0 model(s)`. Snapshot before run 1, after run 1, and after run 2 was identical. Hashes are recorded below. |
| `06-05-real-inspector-malformed-attempt` | 05:47:12–05:47:12 | `local-static` | `python scripts/inspect-tflite.py $env:TEMP\prutasai-phase6-malformed.tflite` with bytes `00 11 22 33 44 55` | **Blocked / 1** | The real CLI stopped before parsing bytes: `LiteRT inspector dependency is unavailable; install the pinned inspection requirements`. Python is 3.11.9 and `ai-edge-litert` is absent. This is not evidence that LiteRT rejected malformed bytes. |
| `06-05-model-free-web-export` | 05:47:26–05:47:49 | `local-static` | `npm --prefix app run build:web` | **Passed / 0** | Expo exported the model-free web bundle to `app/dist`; Metro bundled 505 modules and emitted the SQLite WASM asset and web bundles. This is a static export, not browser execution. |
| `06-05-android-prebuild-config` | 05:48:21–05:48:23 | `local-static` | From `app/`: `.\node_modules\.bin\expo.cmd config --type prebuild --json` | **Passed / 0** | Static Expo configuration resolved `PrutasAI` with Android configuration and package identifier present. No Android package was built or installed. |
| `06-05-owner-model-snapshot` | 05:49:00–05:49:02 | `local-static` | Read `models/manifest.json`, `models/approval.json`, and count source/generated `.tflite` files; check Python and Android prerequisites | **Blocked / n/a** | No owner-approved records, model bytes, pinned inspector runtime, Android SDK, or device tools are present. No model was written, downloaded, or inferred. |

## Temporary-Root Transaction and Preservation Evidence

The focused sync tests create and clean isolated roots under the operating system temporary directory. The synthetic source bytes are ordinary text named with a test fixture filename; they are not a model weight. An injected inspector result exercises transaction plumbing only.

The passing `06-05-local-test-contract-sync` run includes:

- `a valid injected inspector result publishes one matched build-validated model set`;
- missing artifact, SHA-256 mismatch, and inspected tensor-shape mismatch rejection;
- failures after publishing each of `assets`, `bundledModels`, `manifest`, and `verifiedModels`, with all four prior outputs compared byte-for-byte; and
- a production CLI integration test that invokes the real bounded inspector and confirms failure preserves prior outputs.

The production integration test accepts the missing-inspector dependency error in this environment. It proves fail-closed invocation and output preservation, not successful real LiteRT parsing or malformed-byte rejection by LiteRT.

## Empty-Manifest Output Hashes

Both consecutive `npm run sync:models` runs exited 0. Snapshot hashes before the first run and after each run were equal:

| Generated output | SHA-256 |
|---|---|
| `app/src/core/ml/bundledModels.ts` | `bda174a5a74e6d092aafcfbf8ef64b5a2a562684db91715f7b0a6b47ec36f997` |
| `app/src/core/ml/manifest.json` | `58b10c78801e9d2d62b3ebce843e383633a43461d1a8442bd9083133f539c61d` |
| `app/src/core/ml/verifiedModels.json` | `1cc3e70b7943fce72267fc3722fdc851b3ca752556be8fa9dc03931d2a3c0d6c` |
| `app/assets/models` tree | 0 files; empty-tree SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

This is reproducibility evidence for the empty source manifest only.

## ISO 8601 `observedAt` Values

The preceding command-result intervals all occurred on 2026-09-25 UTC. These start timestamps are the `observedAt` values for the corresponding evidence records.

| Evidence ID | `observedAt` |
|---|---|
| `06-05-local-test-contract-sync` | `2026-09-25T05:43:40Z` |
| `06-05-local-test-status-ui` | `2026-09-25T05:43:40Z` |
| `06-05-local-static-typecheck` | `2026-09-25T05:43:56Z` |
| `06-05-local-test-root-suite` | `2026-09-25T05:44:11Z` |
| `06-05-local-test-api` | `2026-09-25T05:45:45Z` |
| `06-05-empty-sync-repeat` | `2026-09-25T05:46:29Z` |
| `06-05-real-inspector-malformed-attempt` | `2026-09-25T05:47:12Z` |
| `06-05-model-free-web-export` | `2026-09-25T05:47:26Z` |
| `06-05-android-prebuild-config` | `2026-09-25T05:48:21Z` |
| `06-05-owner-model-snapshot` | `2026-09-25T05:49:00Z` |

## Browser, Android, Owner, and Inference Boundaries

| Requirement | Browser runtime | Android package/device | Owner approval and real model inspection | Inference |
|---|---|---|---|---|
| MLRD-01 | **Not tested**; export alone does not exercise browser UI. | **Blocked**; package/device prerequisites are absent. | **Blocked**; no owner-approved file/contract exists. | **Not tested**. |
| MLRD-02 | **Not tested** for a model-present web package. | **Blocked** for APK/model-present packaging. | **Blocked**; no approved bytes, pinned Python 3.12 inspector, or real positive inspection. | **Not tested**. |
| MLRD-03 | **Not tested** in a browser runtime. | **Blocked** for model-present Android runtime. | **Blocked**; no validated owner model set exists. | **Not tested**; generated metadata is not inference. |
| MLRD-04 | **Not tested** in a browser; model-free static web export **Passed** above. | **Blocked** for APK/device demonstration; Android config static check **Passed** above. | **Blocked** for the future import action; empty-model workflow is documented. | **Not tested**. |

Do not promote any of the static or synthetic results above to browser, device, owner-approval, or inference evidence. The full root suite also remains **Failed** until the `fruitPapaya` translation assertion is resolved and the root suite is rerun by the global verification owner.

## Inherited Phase Gates

- **Phase 3:** remains `remediation_required`; disposable migration rehearsal is **Blocked** and authenticated account/anonymous QA is **Not tested**. See [03-VERIFICATION-REPORT.md](../03-cloud-auth-and-sync-security/03-VERIFICATION-REPORT.md).
- **Phase 4:** its local-only exception remains narrow; 04-12/04-09 closure, Android/full-browser runtime evidence, and the Monitoring scheduling decision remain pending.
- **Phase 5:** local SAFE evidence remains distinct from browser/device, bilingual/agronomic review, live-provider, authenticated, and deployed-QA gates. See [05-VERIFICATION.md](../05-assistant-climate-and-safety/05-VERIFICATION.md).

No Phase 6 command or artifact closes these inherited gates.

## Orchestrator Global Verification Addendum — 2026-09-25

The independent global pass reviewed the five plan summaries, the import validator and transactional sync, the generated-metadata registry, and the reachable model-status route. It reproduced the language-inventory failure with `npm --prefix app test -- --runInBand src/features/__tests__/language.test.tsx` (exit 1: `fruitPapaya` was the sole unexpected identical EN/FIL value). It also found that the model-status Refresh action only displayed cached counts rather than re-reading model metadata.

GPT-6 Luna fix agents committed `a603ecb` (add the legitimate identical `Papaya` label to the strict translation inventory) and `d0c7983` (remove the misleading model-status refresh action and update its route test). The language test then passed 9/9; the focused model-status route tests passed 2/2; the fix agent's root typecheck passed.

At HEAD `d0c79830105f993ed427fc790d55bf3ceea35d1a` on branch `Thesis_2_Prototype`, with the pre-existing dirty worktree preserved, the orchestrator reran `npm test` and `npm run typecheck`. Both exited **0**, with results observed by 2026-09-25T06:23:49Z. The root test command reached its script, app, and API phases; the earlier failed run remains recorded above and is superseded only for the current local-test verdict. `git show --check` passed for both fix commits, and `gsd-sdk query init.execute-phase 6` reported five summaries and zero incomplete plans.

These post-fix checks establish a passing local suite and typecheck for this dirty checkout. They do not add owner-approved model bytes, a positive real LiteRT inspection, browser runtime, an Android APK/device run, or inference evidence. The corresponding **Blocked** and **Not tested** verdicts above remain unchanged.
