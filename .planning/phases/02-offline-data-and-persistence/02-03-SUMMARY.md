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
- Refined sync boundaries: drain.ts now enforces image-free payloads, and selectively ships image_uri metadata only for active scans while omitting it for soft-deleted items.
- Coarse coordinate normalizations confirmed intact for all device-located records.

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
- image_uri string is sent to the server for active scans to trace sync state, but omitted for trashed ones. The actual image byte array is never sent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Next Phase Readiness
- File isolation and persistence constraints are established.
- Ready for broader file-system reliance (if any) or cloud architecture expansions.
