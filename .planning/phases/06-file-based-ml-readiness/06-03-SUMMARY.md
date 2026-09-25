---
phase: 06-file-based-ml-readiness
plan: "03"
subsystem: ml-readiness
tags: [typescript, react-native, model-status, fruit-capability]

# Dependency graph
requires:
  - phase: 06-02
    provides: Generated verifiedModels.json with build validation, SHA-256, manifest version, and inference-unverified status
provides:
  - Fruit-specific projection of verified fruit, variety, and disease model roles
  - App capability summary separated from file installation and fixed to inference depth zero
affects: [model-import, chat-capability, model-status]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Generated model metadata is matched against the source manifest and static bundle map before a role is marked ready
    - Fruit role chains stop at the first missing prerequisite, while inference remains unavailable

key-files:
  created: []
  modified:
    - app/src/core/ml/manifest.ts
    - app/src/core/ml/registry.ts
    - app/src/core/ml/__tests__/registry.test.ts
    - app/src/core/status/index.ts
    - app/src/core/status/__tests__/status.test.ts
    - app/src/navigation/AppNavigator.tsx
    - app/src/features/modelStatus/ModelStatusScreen.tsx

key-decisions:
  - "Build-validated metadata can establish installed model files but never inference readiness."
  - "A role contributes to a fruit chain only when its fruit scope and every earlier role match."
  - "The app-facing inference depth stays zero until a real runner and device evidence exist."

patterns-established:
  - "Reachable app surfaces consume resolveModelRegistry(manifest, bundledModels, verifiedModels) as their shared status source."
  - "ModelStatus rows expose metadata mismatch notes without turning them into runtime capability claims."

requirements-completed: [MLRD-03]

# Metrics
duration: ~20min
completed: 2026-09-25
---

# Phase 6 Plan 3: Fruit-Specific Verified Model Status

**Generated build metadata now projects validated model roles by fruit while runtime inference remains explicitly unavailable.**

## Performance

- **Duration:** ~20 minutes
- **Started:** 2026-09-25T04:49:00Z (estimated from the execution timeline)
- **Completed:** 2026-09-25T05:08:00Z
- **Tasks:** 2/2
- **Files modified:** 7

## Accomplishments

- Bound each declared model to generated validation metadata by manifest version, role, stage, filename, version, fruit scope, SHA-256, build-validation flag, and bundle presence.
- Added separate validated-role and prerequisite-complete role lists for banana, mango, and papaya. A variety or disease role cannot bypass earlier roles.
- Kept `canRunInference` and `inferenceVerified` false, and passed depth zero to chat and model-status surfaces.
- Switched both `AppNavigator` and `ModelStatusScreen` to the same generated `verifiedModels.json` projection. Model rows include validation failure notes.

## Task Commits

1. **Task 1: RED — specify per-fruit validated roles and non-inference status** — `4553252` (`test(06-03): specify verified fruit model status`)
2. **Task 2: GREEN/REFACTOR — consume verified metadata once and project status** — `0de8cb4` (`feat(06-03): project verified model status by fruit`)

## Files Created/Modified

- `app/src/core/ml/manifest.ts` — types for generated build-validation metadata.
- `app/src/core/ml/registry.ts` — fail-closed metadata binding and fruit-specific role-chain projection.
- `app/src/core/ml/__tests__/registry.test.ts` — empty, partial, complete, prerequisite, missing-file, and metadata-mismatch cases.
- `app/src/core/status/index.ts` — status wording distinguishes installed files from inference readiness.
- `app/src/core/status/__tests__/status.test.ts` — checks truthful status and fruit separation.
- `app/src/navigation/AppNavigator.tsx` — loads generated metadata once and supplies inference depth zero to chat.
- `app/src/features/modelStatus/ModelStatusScreen.tsx` — uses the same projection and displays model validation notes.

## Consumer Trace

- `AppNavigator` derives model rows and capability copy from the shared registry. `useChatRuntime` receives `depth: 0`, so build validation cannot enable scan or diagnosis claims.
- `ModelStatusScreen` reads the same generated metadata and registry; its stage depth also stays zero while rows may report matching build-validated files.
- No runtime call to `pipelineDepth` remains on these surfaces. The compatibility function returns zero; the remaining references are type imports or comments.
- Existing model-free result behavior remains unchanged. The checked-in source manifest and generated verified metadata contain no models, so positive model import and inference were not exercised.

## Verification

| Check | Result |
|---|---|
| RED: focused registry/status suite before implementation | Failed as expected: 18 cases could not call the not-yet-implemented registry projection. |
| GREEN: `npm --prefix app test -- --runInBand src/core/ml/__tests__/registry.test.ts src/core/status/__tests__/status.test.ts` | Passed: 20 tests, 2 suites, 0 failures. |
| `npm --prefix app run typecheck` | Passed, exit 0. |
| `git diff --check` on 06-03-owned files | Passed, exit 0. |
| Consumer trace for `pipelineDepth` and `describeDetectionCapability` | App surfaces share the projection; no runtime depth calculation enables inference. |

Synthetic fixtures establish registry behavior only. No approved weights, positive real-model inspection, device inference, or model-present runtime evidence are available.

## TDD Gate Compliance

- RED test commit `4553252` precedes GREEN implementation commit `0de8cb4`.
- The final focused registry/status suite passes all 20 cases.

## Decisions Made

- Validated roles remain separate from prerequisite-complete role chains, so partial files are reported without implying later-stage ability.
- The static bundle map proves that a declared asset is included; matching generated SHA metadata proves only the build validation recorded by synchronization.
- Runtime inference depth remains zero until a real runner and direct device evidence exist.

## Deviations from Plan

None — plan executed as written.

## Issues Encountered

The first synthetic metadata fixture omitted the generated `stage` field. Inspection of `scripts/sync-models.mjs` confirmed that field is emitted, so the fixture was corrected before the final green run.

## User Setup Required

None — no external service configuration is needed for the model-free path.

## Next Phase Readiness

Downstream Phase 6 work can use the fruit-specific registry and the truthful installed-versus-inference status boundary. Real model import and on-device inference remain unverified because no approved model artifact or device evidence is present.

## Self-Check: PASSED

- All seven 06-03 source/test files and this summary exist.
- RED commit `4553252` and GREEN commit `0de8cb4` are present in git history.
- No plan-owned source file deletions were committed.

---
*Phase: 06-file-based-ml-readiness*
*Completed: 2026-09-25*
