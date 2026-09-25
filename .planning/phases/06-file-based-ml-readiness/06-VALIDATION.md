---
phase: 06
slug: file-based-ml-readiness
status: evidence-recorded
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-24
---

# Phase 6 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Node test runner for sync script; Jest 29 with jest-expo for app; TypeScript 5.9 |
| Config file | Root `package.json`, `app/package.json` |
| Quick run command | `node --test scripts/sync-models.test.mjs` and `npm --prefix app test -- --runInBand src/core/ml/__tests__/registry.test.ts` |
| Full suite command | `npm run typecheck` and `npm test` |
| Measured runtime | Root typecheck: 8 seconds; full root suite: 12 seconds to failure; web export: 23 seconds. See `06-EVIDENCE.md` for exact timestamps. |

## Sampling Rate

- After a validator task: run the focused Node test file, including malformed and rollback cases.
- After a registry/UI task: run focused app model and reachable-route suites.
- After each wave: run typecheck plus the relevant focused suites.
- At the final plan: run the full root suite and model-free build checks; record exact commands, exit codes, checkout state, and platform evidence separately.

## Per-Task Verification Map

| Plan | Requirement | Automated proof | Expected limit |
|------|-------------|-----------------|----------------|
| 06-01 | MLRD-01, MLRD-02 | Contract schema and validator RED/GREEN tests; missing/hash/shape/version/approval rejection | No owner-approved real contract exists yet. |
| 06-02 | MLRD-02, MLRD-04 | Transactional sync/rollback and deterministic empty-build tests | Synthetic models prove tool behavior only. |
| 06-03 | MLRD-03 | Fruit-specific registry/status/reachable route assertions in EN/FIL | Build validation is not inference proof. |
| 06-04 | MLRD-01, MLRD-04 | Document assertions, full test/typecheck, web export, available Android checks | Real import, device inference, and unavailable platform checks remain open. |
| 06-05 | MLRD-01–04 | Requirement-scoped focused/full tests, typecheck, empty-sync hash repeat, web export, Android config check | Full root suite failed at `fruitPapaya`; real owner model, browser runtime, Android package/device, and inference evidence remain open. |

## Wave 0 Requirements

- Use injected structured inspector output to test positive transaction plumbing; do not create, download, mock, or commit `.tflite` weights. A real positive LiteRT inspection remains a future owner-artifact gate.
- Add a pure test seam for inspector failure and transactional publication failure.
- The existing Node/Jest infrastructure is sufficient; package selection for structural inspection must be pinned and documented during implementation.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|
| Owner-approved real model import | MLRD-01, MLRD-02 | Approved weights and exact tensor contract are absent | Record owner approval, artifact hashes, positive actual LiteRT tensor inspection, sync output, and resulting bundle; until supplied, mark Blocked/Not tested. |
| Android package and real inference | MLRD-03, MLRD-04 | Device/runtime and approved weights required | Install build, inspect model status per fruit, run a real image through approved runner, capture sanitized evidence; until then, `Inference unverified`. |
| Web model-present package | MLRD-02, MLRD-04 | Export with approved assets must be observed | Verify emitted assets and response behavior; do not infer from empty-manifest export. |

## Validation Sign-Off

- [x] Every plan task has a focused automated check or an explicit manual evidence boundary.
- [x] Temporary-root failure cases preserve the last valid generated set byte-for-byte.
- [x] Empty-manifest sync and model-free web export remain reproducible.
- [x] Partial fruit-specific status tests do not claim diagnosis or proven inference.
- [x] Owner/device/model-present gaps remain Blocked or Not tested until direct evidence exists.

**Approval:** pending

## Final Execution Results — 2026-09-25

The focused model-contract/sync suite passed 39/39; the focused registry/status/route/UI suite passed 102/102; root typecheck passed; and the separate API suite passed 157/157. Two empty-manifest syncs exited 0 and had identical generated hashes. The model-free Expo web export and Android prebuild-configuration parse passed.

The full root `npm test` command **Failed** in `src/features/__tests__/language.test.tsx` because `fruitPapaya` was reported as an additional untranslated Filipino key. The chained API phase did not run in that command, so its 157 passing tests were run separately. The direct malformed-byte inspector attempt was **Blocked** before parsing because Python 3.11.9 lacks the pinned `ai-edge-litert` dependency; no successful real LiteRT parsing is claimed.

Browser runtime is **Not tested**. Android package/device checks are **Blocked** because the Android SDK, `adb`, and device are absent. Owner-approved model import and real inference remain **Blocked** / **Not tested** because there are no owner artifacts or tensor approvals. Exact commands, timestamps, exits, hashes, and evidence scopes are in [06-EVIDENCE.md](./06-EVIDENCE.md); requirement verdicts are in [06-VERIFICATION.md](./06-VERIFICATION.md).
