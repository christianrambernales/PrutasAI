---
mapped_at: 2026-09-15
---

# Structure

## Top-level directories

- `app/` — Expo client, native/web UI, local database, feature flows, and tests.
- `api/` — Vercel serverless REST endpoints, shared handlers, and Vitest tests.
- `knowledge/` — authored agricultural taxonomy, requirements, diseases, remedies, and sources.
- `ml/` — training/export/XAI utilities and model contracts.
- `models/` — versioned model manifest and weight staging instructions.
- `scripts/` — knowledge compilation, model synchronization, and web startup tooling.
- `supabase/migrations/` — PostgreSQL schema and policy history.
- `docs/` — build guidance and architectural specifications.

## Client organization

- Entry and navigation: `app/App.tsx`, `app/index.ts`, `app/src/navigation/`.
- State: `app/src/state/appState.ts`.
- Core domains: `app/src/core/auth/`, `chat/`, `climate/`, `db/`, `geo/`, `ml/`, `severity/`, `status/`, and `sync/`.
- Screens/flows: `app/src/features/<feature>/` with colocated tests in `__tests__/`.
- Shared UI: `app/src/ui/components/`, `app/src/ui/theme.ts`, `app/src/ui/tokens.ts`, and `app/src/ui/i18n/`.

## API organization

- Public route files use kebab-case names under `api/v1/`.
- Reusable request logic is split into `api/_lib/handlers/` and low-level helpers beside it.
- API tests mirror endpoint concerns under `api/__tests__/`.

## Naming and generated data

- TypeScript modules use camelCase filenames and named exports.
- React screen components use PascalCase filenames; hooks use `useX` names.
- SQL migrations are numbered and append-only.
- `app/src/core/db/seed.sql`, generated class mappings, and synced model require maps are build outputs derived from source data.
