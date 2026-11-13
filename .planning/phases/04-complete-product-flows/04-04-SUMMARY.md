# Phase 04 Plan 04 (04-04) - Local Monitoring Migration and Repository

## Objective
Implement durable scoped local monitoring migration and repository following RED/GREEN/REFACTOR TDD.

## Execution

1. **RED** (`test(04-04): specify durable observation monitoring`):
   - Defined tests in `migrate.test.ts` to assert that schema version upgrades to v7 correctly, and fails/rolls back appropriately if migration 7 fails.
   - Asserted that ML columns (`diagnosis`, `disease`, `severity`, etc.) are prohibited in monitoring tables, enforcing Phase 3 D-17 boundaries.
   - Defined `monitoringRepository.test.ts` describing idempotent sessions (tied to Day 1 `scan`), checkpoints restricted to Days 5 and 10, observation enum validation, timestamp separations, and LocalAccountScope-based access.
   - Verified tests failed appropriately.

2. **GREEN/REFACTOR** (`feat(04-04): persist observation monitoring`):
   - Created `007_monitoring.sql` adding `monitoring_session` and `monitoring_checkpoint` tables.
   - Injected v7 migration to `migrate.ts`.
   - Built `repositories/monitoring.ts` leveraging SQLite operations parameterized via `buildScopeCondition` to enforce `LocalAccountScope` constraints.
   - Re-ran tests, confirming `PASS` across `migrate.test.ts` and `monitoringRepository.test.ts`.

## Verification Run
- `npm --prefix app test -- --runInBand src/core/db/__tests__/migrate.test.ts src/features/monitoring/__tests__/monitoringRepository.test.ts` passed perfectly.
- Typecheck verified clean types.
- Constraints honored: no ML diagnostic column added, syncing disabled natively in these columns, preserving offline boundary.
