---
phase: 06-file-based-ml-readiness
plan: "02"
subsystem: ml-readiness
tags: [node, tflite, litert, sha256, transactional-sync]

# Dependency graph
requires:
  - phase: 06-01
    provides:
      - Validated source manifest and owner approval registry with tensor and signature contracts
provides:
  - Fail-closed model synchronization with SHA-256, tensor, signature, and approval validation
  - Matched transactional publication and restoration of four generated outputs
  - Build-validated, inference-unverified generated model metadata
affects: [model-import, app-ml-status, model-build]

# Tech tracking
tech-stack:
  added: [ai-edge-litert==2.2.0]
  patterns:
    - Real LiteRT inspection runs only for nonempty imports through a bounded Python subprocess
    - Injected inspector results are confined to a temporary-root test API
    - All validation completes before a staged four-output publication with rollback

key-files:
  created:
    - scripts/inspect-tflite.py
    - ml/requirements-model-inspection.txt
    - app/src/core/ml/verifiedModels.json
  modified:
    - scripts/sync-models.mjs
    - scripts/sync-models.test.mjs
    - .gitignore
    - app/src/core/ml/bundledModels.ts
    - app/src/core/ml/manifest.json

key-decisions:
  - "Keep model-free synchronization independent of Python and LiteRT."
  - "Require actual model bytes, tensor details, and LiteRT signatures to match the owner-approved contract before publication."
  - "Report generated metadata as build-validated and inference-unverified."
  - "Publish the assets directory, require map, copied manifest, and verified metadata as one rollback-capable set."

requirements-completed: [MLRD-02, MLRD-04]

# Metrics
duration: 21min
completed: 2026-09-25
---

# Phase 6 Plan 2: Transactional Model Bundle Sync Summary

**Model synchronization now validates approved bytes and LiteRT tensor/signature metadata before publishing a rollback-protected four-output bundle.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-09-24T16:11:27Z
- **Completed:** 2026-09-24T16:32:42Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added RED coverage for deterministic empty sync, missing files, SHA mismatch, inspector and metadata mismatches, version/approval mismatch, unlisted files, symlink escape, staging copy failure, and failure after each of the four publication steps.
- Implemented real LiteRT inspection for every nonempty production import. The child process has a 30-second timeout, bounded output, and sanitized failures; the empty source manifest skips Python.
- Validated computed SHA-256, role/version/approval binding, tensor names/shapes/dtypes, and exact approved signature keys and bindings before staging.
- Staged the assets directory, bundledModels.ts, copied manifest.json, and verifiedModels.json; a failed install restores each prior output byte-for-byte.
- Generated deterministic zero-model metadata with build_validated and inference_status: unverified. No model weights were added.

## Task Commits

1. **Task 1: RED — specify full-sync failure and preservation behavior** - 9ffdd3c (test)
   - Tightened the production-inspector integration assertion in 8048762 (test).
2. **Task 2: GREEN — inspect real tensors before transactional publication** - d3484aa (inspector and pinned requirements), e548ca3 (transactional synchronization and ignore rule).

## Files Created/Modified

- scripts/sync-models.test.mjs - Temporary-root tests for empty, validated, failure, containment, and rollback paths.
- scripts/sync-models.mjs - Contract and byte validation, bounded real inspection, deterministic metadata, and matched publication with rollback.
- scripts/inspect-tflite.py - Structured LiteRT input/output/signature metadata inspection without inference.
- ml/requirements-model-inspection.txt - Pins ai-edge-litert==2.2.0 for Python 3.12.
- .gitignore - Ignores the generated verified metadata file.
- app/src/core/ml/bundledModels.ts, app/src/core/ml/manifest.json, app/src/core/ml/verifiedModels.json - Deterministic outputs from the empty checked-in manifest.
- app/assets/models/ - Empty generated asset directory for the current model-free build.

## Decisions Made

- The generated verified record carries inspected tensor and signature metadata plus owner approval provenance, while keeping inference status explicitly unverified.
- Tensor dimension contracts compare against LiteRT shapeSignature when available so approved -1 dynamic dimensions retain their declared meaning; both runtime shape and shape signature are included in generated metadata.
- The test-only API requires explicit temporary roots and an injected inspector; the production CLI always invokes the real Python inspector for nonempty imports.

## Deviations from Plan

### Coordinated dependency amendment

**1. Added approved signature declarations to the 06-01 contract before implementing strict signature comparison.**
- **Found during:** Task 2 (GREEN — inspect real tensors before transactional publication)
- **Issue:** Plan 06-02 requires actual LiteRT signatures to match owner approval, but the original 06-01 approval schema did not store signature keys or bindings.
- **Fix:** The orchestrator coordinated an upstream 06-01 amendment adding an explicit approved signatures array; this executor then compares normalized actual key and alias-to-tensor maps exactly.
- **Files modified:** 06-01-owned approval schema, parser, types, tests, and documentation.
- **Verification:** model-contract tests passed 15/15; sync-models tests passed 23/23.
- **Committed in:** 3b8aeb5 (06-01 implementation).

**Total deviations:** 1 coordinated dependency amendment.
**Impact on plan:** The added contract field closes a required verification gap; no real artifact values or approvals were invented.

## Verification

| Check | Result |
|---|---|
| RED: node --test scripts/sync-models.test.mjs before implementation | Failed as expected: 3 existing map tests passed and 20 new synchronization checks failed; the real CLI still bundled an invalid temporary import. |
| GREEN: node --test scripts/sync-models.test.mjs | Passed, 23 tests and 0 failures. All injected failure cases preserved all four prior outputs byte-for-byte. |
| node --test scripts/model-contract.test.mjs | Passed, 15 tests and 0 failures, including approved signatures. |
| npm run sync:models | Passed, bundled 0 models without Python or LiteRT. |
| npm --prefix app run typecheck | Passed, exit 0. |
| Nonempty production CLI integration | Reached the real inspector and failed closed; current Python is 3.11.9 and ai-edge-litert is unavailable. Prior temporary outputs remained unchanged. |
| Source models/ weight scan | No .tflite files present. |
| git diff --check for plan-owned implementation files | Passed. |

Injected inspector fixtures establish synchronization and rollback behavior only. Positive LiteRT inspection, owner-approved artifact compatibility, and Android inference remain **Not tested** until the owner supplies a real approved model and the pinned Python 3.12 inspection environment is available.

## Issues Encountered

The local environment has Python 3.11.9 and does not have the pinned ai-edge-litert package. This did not affect the empty-manifest path. The nonempty production path reports the missing runtime and retains the previous generated bundle; real model parsing remains unverified.

## User Setup Required

None for the checked-in empty manifest. A future nonempty import requires Python 3.12 with ml/requirements-model-inspection.txt installed and an owner-approved model artifact and contract.

## Next Phase Readiness

The model-free synchronization and generated metadata are ready for downstream status work. Real-model import and inference remain unavailable pending owner artifacts and the Python 3.12 LiteRT environment. Later Phase 6 plans were not executed in this task.

## Self-Check: PASSED

- Summary file exists at the required phase path.
- All task and dependency commit references resolve in Git history.
- All listed source and generated metadata files exist.
- No unexpected tracked file deletions are included in the plan commits.

---
*Phase: 06-file-based-ml-readiness*
*Completed: 2026-09-25*
