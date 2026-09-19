---
phase: 03-cloud-auth-and-sync-security
plan: 05
subsystem: sync
tags: [sqlite, retry, restore, ownership]
requires:
  - phase: 03-04
    provides: verified active account scope
  - phase: 03-06
    provides: owner-enforcing API contract
provides:
  - Owner-safe drains, deterministic restore, persisted retry scheduling
affects: [03-07]
tech-stack:
  added: []
  patterns: [allowlisted sync payloads, timestamp conflict states, capped jitter]
key-files:
  created: [app/src/core/sync/backoff.ts, app/src/core/sync/__tests__/backoff.test.ts]
  modified: [app/src/core/sync/drain.ts, app/src/core/auth/restore.ts]
key-decisions:
  - "Permanent rejections become needs_attention while later owner rows continue."
  - "Remote data never overwrites local image_uri or ownership."
requirements-completed: [OFFL-04, SYNC-02, SYNC-03]
duration: 1h
completed: 2026-09-19
---

# Phase 03 Plan 05: Owner-safe sync state machine Summary

**Owner-bound allowlisted drains, deterministic timestamp/deletion restore merge, and persisted capped retry scheduling with manual delay override.**

## Accomplishments

- Excluded unowned/other-owner rows and private photo/device fields from authenticated sync payloads.
- Preserved local photos, marked malformed timestamps as conflicts, and prevented cross-owner message attachment.
- Persisted retry count/next-attempt on transport, timeout, throttling, and server failures; manual sync clears delay only.

## Verification

- Focused drain, backoff, restore, and account Jest suites — 73 tests Passed.
- `npm --prefix app run typecheck` — Passed.
- Full `npm test` — 596 passed, 5 skipped.

## Deviations from Plan

None - plan behavior was implemented with existing repository state-transition primitives.

## Self-Check: PASSED

Created retry/test files exist and full repository verification passed.
