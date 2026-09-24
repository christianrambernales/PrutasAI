---
phase: 06-file-based-ml-readiness
plan: 01
subsystem: ml-readiness
tags: [node, tflite, manifest, owner-approval, model-contract]

# Dependency graph
requires: []
provides:
  - Pure validator for versioned model manifests and separate owner approval records
  - JSON Schema contract and empty approval registry for future owner submissions
  - Strict source manifest, role, fruit, and tensor contract types
affects: [model-sync, app-ml-status]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure contract validation, owner approval separated from manifest, stable validation error codes]

key-files:
  created: [scripts/model-contract.mjs, scripts/model-contract.test.mjs, models/approval-contract.schema.json, models/approval.json]
  modified: [models/README.md, app/src/core/ml/manifest.ts]

key-decisions:
  - "Keep the empty source manifest and approval registry as the valid model-free state."
  - "Require a matching owner-approved record for every nonempty manifest role, bound to its file, version, hash, fruit scope, and confidence threshold."
  - "Keep actual tensors, labels, threshold values, versions, and hashes absent until supplied with owner-approved artifacts."

patterns-established:
  - "Role IDs map to explicit pipeline stages and supported fruit applicability."
  - "Validation failures expose stable codes through ModelContractError.code."

requirements-completed: [MLRD-01, MLRD-02]

# Metrics
duration: 14min
completed: 2026-09-25
---

# Phase 6 Plan 1: Owner-Approved Model Contract Summary

**A pure validator now rejects nonempty model manifests unless each role has a matching owner-approved artifact and tensor contract; empty model-free source remains valid.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-24T15:54:14Z
- **Completed:** 2026-09-24T16:08:21Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added test-first coverage for empty manifests, the five role IDs, explicit fruit applicability, safe basenames, unique roles/files, versions, SHA-256, confidence thresholds, tensor metadata, label mapping, and owner approval matching.
- Implemented `parseModelContract(manifestInput, approvalsInput)` with stable error codes and no filesystem access. Every nonempty manifest entry must match an `owner_approved` registry record by role, filename, version, hash, fruits, and confidence threshold.
- Added the machine-checkable approval schema, an empty `models/approval.json`, model import instructions, and TypeScript types for source contracts and approval records.
- Preserved `models/manifest.json` as `{ "manifest_version": 1, "models": [] }`; no model files or production-looking approval examples were added.

## Verification

| Check | Result |
|---|---|
| RED: `node --test scripts/model-contract.test.mjs` before implementation | Failed as expected with `ERR_MODULE_NOT_FOUND` for the not-yet-created validator module. |
| GREEN: `node --test scripts/model-contract.test.mjs` | Passed, 12 tests and 0 failures. |
| `npm --prefix app run typecheck` | Passed, exit 0. |
| Parse actual source manifest and approval registry through `parseModelContract` | Passed; both arrays contain zero entries. |
| Parse `models/approval-contract.schema.json` | Passed. |
| Inspect `models/` for `.tflite` files | None present. |
| `git diff --check` on edited tracked files | Passed. |

The approval registry and fixtures do not establish owner approval for a real artifact. The validator checks contract structure and equality; synchronization still needs to verify actual file bytes and publish transactionally in a later plan. Real tensor inspection, device inference, and model-present status remain unavailable.

## Task Commits

1. **Task 1: RED — specify import-contract acceptance and rejection** - `7bcf76c` (`test(06-01): specify approved model contract validation`)
2. **Task 2: GREEN/REFACTOR — implement the contract validator and owner template** - `d2842f8` (`feat(06-01): implement approved model contract validation`)

## Files Created/Modified

- `scripts/model-contract.test.mjs` - Test-only synthetic contracts and rejection cases; no production hashes, labels, or tensor claims.
- `scripts/model-contract.mjs` - Pure parser and validator with named failure codes.
- `models/approval-contract.schema.json` - Schema for future owner-approved records.
- `models/approval.json` - Empty source approval registry.
- `models/README.md` - Role, fruit, contract, and owner handoff guidance.
- `app/src/core/ml/manifest.ts` - Role, fruit, source manifest, tensor, and approval types while keeping the existing app-facing manifest compatible with current tests.

## Decisions Made

- A manifest role ID is the role itself; each role can occur once and each entry declares its fruit applicability.
- Fruit detector and disease detector roles may name an explicitly approved supported subset. A variety role is restricted to its corresponding fruit.
- Tensor dimensions, labels, thresholds, model versions, and artifact hashes remain owner-supplied; test fixtures are synthetic and confined to the test file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved app-facing manifest type compatibility**
- **Found during:** Task 2 (GREEN/REFACTOR — implement the contract validator and owner template)
- **Issue:** Narrowing the existing app-facing `ModelEntry.id` and `stage` types caused TypeScript errors in existing registry tests that use inferred fixture values.
- **Fix:** Kept the runtime-facing `ModelEntry` compatible and added strict `SourceModelEntry` and `SourceManifest` types for validated source data.
- **Files modified:** `app/src/core/ml/manifest.ts`
- **Verification:** `npm --prefix app run typecheck` passed with exit 0.
- **Committed in:** `d2842f8`

**Total deviations:** 1 auto-fixed (Rule 1: 1). **Impact:** Kept existing runtime consumers type-safe while making the new source contract strict; no scope expansion.

## Issues Encountered

The first typecheck exposed the compatibility issue above; it was fixed before the task commit. No unresolved issues remain within this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 06-01 is ready for integration with the model synchronization plan. The current checkout still has no owner-approved artifact or real tensor contract, so model-present import and inference remain unverified.

## Self-Check: PASSED

- All plan-owned source files and this summary exist.
- RED commit `7bcf76c` and GREEN commit `d2842f8` are present in git history.

---
*Phase: 06-file-based-ml-readiness*
*Completed: 2026-09-25*
