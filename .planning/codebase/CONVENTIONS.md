---
mapped_at: 2026-09-15
---

# Conventions

## TypeScript and modules

- ES module syntax and named exports are the dominant style.
- Interfaces and discriminated unions define public contracts for screens, providers, state, and storage drivers.
- Pure functions are preferred for reducers, filters, severity calculations, intent matching, and view builders.
- Dependency injection is used for fetch/database implementations in testable core and API functions.

## React patterns

- Screens expose explicit `Props` interfaces and are composed by navigation renderers.
- Hooks own asynchronous loading and orchestration; screens primarily render derived state and invoke callbacks.
- Shared controls and chrome live in `app/src/ui/components/` and are re-exported from `app/src/ui/index.ts`.
- Text is sourced through `useT()` and the English/Filipino dictionaries rather than hard-coded in screens.

## Errors and status

- Async failures become typed status/error values and user-visible notices.
- Startup failures are rendered by the `Startup` gate in `app/App.tsx`; they are not swallowed.
- Capability/status modules avoid claiming a model or network feature that is unavailable.
- API handlers return consistent HTTP responses through `api/_lib/http.ts` and log upstream failures without exposing credentials.

## Persistence and privacy

- SQLite access is hidden behind `SqlDriver`, migrations, seed logic, and repositories.
- Sync operations are idempotent and retain local state when offline or when a request fails.
- Image paths are kept local; cloud payloads contain metadata only.
- Auth/session handling is isolated in `app/src/core/auth/` and cloud ownership is enforced by server checks plus database policies.

## Formatting and tests

- Existing code uses semicolons, single quotes, trailing commas, and compact focused modules.
- Tests use behavior-oriented names and assert user-visible or contract-level outcomes.
