---
phase: 02-offline-data-and-persistence
plan: 03
subsystem: database
tags: [sqlite, file-system, sync, location]

# Dependency graph
requires:
  - phase: 02-offline-data-and-persistence
    provides: [scan schema, geocoding normalizer]
provides:
  - Owned-photo lifecycle via PhotoStore
  - Safe soft-delete and permanent-deletion primitives for scans
  - Cleaned up sync payload generation and coarse location constraints
affects: [sync, location, features/capture]

# Tech tracking
tech-stack:
  added: [expo-file-system]
  patterns: [owned-photo lifecycle, safe file deletion]

key-files:
  created:
    - app/src/core/files/photoStore.ts
    - app/src/core/files/expoPhotoStore.ts
    - app/src/core/db/migrations/005_scan_retention.sql
    - app/src/core/sync/purgeScanTrash.ts
  modified:
    - app/src/core/db/repositories/scans.ts
    - app/src/features/capture/useCaptureRoute.ts
    - app/src/core/sync/drain.ts

key-decisions:
  - "Scan images are copied to an app-owned document namespace before database insertion."
  - "Scan trash requires deleted_at tracking to prevent unintended sync drops of soft-deleted rows, enabling reliable sync of deletion state."
  - "Permanent deletion first unlinks the file, gracefully continuing if it is already missing, but throwing on failure rather than deleting the DB row, ensuring retries."

patterns-established:
  - "Pattern 1: File-first resource deletion. Delete file before removing database rows so failure leaves the system recoverable."

requirements-completed: [OFFL-03]

# Metrics
duration: 35min
completed: 2026-09-17
---

# Phase 02: Offline Data and Persistence - Plan 03 Summary

**Implementation of scan retention primitives, app-owned photo management, and strict coarse location/network boundary enforcement.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-17T00:00:00Z
- **Completed:** 2026-09-17T00:35:00Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- Implemented PhotoStore to safely copy captured photos into an app-owned namespace.
- Added safe trash/restore and permanent-deletion primitives (both file and DB row) to scan repository.
- Refined sync boundaries: drain.ts now completely drops `image_uri` from network payloads, strictly enforcing the D-13 privacy constraint.
- Coarse coordinate normalizations confirmed intact for all device-located records.
- Fixed TypeScript typecheck errors in `expoPhotoStore` by importing from `expo-file-system/legacy`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Own photos before committing scan rows** - 354af7e (feat)
2. **Task 2: Add safe scan trash and permanent-deletion primitives** - 5bc0596 (feat)
3. **Task 3: Enforce coarse location and image-free network types** - e9a1933 (feat)

## Files Created/Modified
- pp/package.json - Declared expo-file-system.
- pp/src/core/files/photoStore.ts - Interface for copying and managing owned photos.
- pp/src/core/files/expoPhotoStore.ts - Expo FileSystem implementation for owned photos.
- pp/src/core/db/migrations/005_scan_retention.sql - Added deleted_at and is_owned_photo flags.
- pp/src/core/db/repositories/scans.ts - Added soft/hard delete, restore, and updated queries to handle deleted_at logic.
- pp/src/core/sync/purgeScanTrash.ts - Handles file + row permanent deletion workflow.
- pp/src/features/capture/useCaptureRoute.ts - Modified to save photos as app-owned.
- pp/src/core/sync/drain.ts - Updated payload constructor to support omitted fields.
- Test files updated across db, sync, and capture.

## Decisions Made
- `image_uri` is completely omitted from the network payloads in `drain.ts` and `PendingScan` to properly enforce the D-13 privacy constraint. The actual image byte array is never sent.
- We use `expo-file-system/legacy` to retain access to `documentDirectory` for Expo SDK 54 compatibility in `expoPhotoStore.ts`.

## Deviations from Plan
A follow-up fix was applied to restore the D-13 privacy constraint (which was initially violated by sending `image_uri`) and to resolve TypeScript typecheck and test failures.

## Issues Encountered
The initial implementation violated the D-13 privacy constraint by including `imageUri` in network payloads and `PendingScan`. It also skipped proper TDD testing and introduced type errors due to incorrect `expo-file-system` imports and missing interface methods in tests. All these issues have been fixed and tests updated.

## Next Phase Readiness
- File isolation and persistence constraints are established.
- Ready for broader file-system reliance (if any) or cloud architecture expansions.
