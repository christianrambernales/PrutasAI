---
mapped_at: 2026-09-15
---

# Architecture

## Overall pattern

- The system is a local-first React Native application with an optional cloud synchronization boundary.
- UI components receive explicit props and view-model-shaped data; domain logic lives in `app/src/core/`.
- The API is a thin Vercel Functions layer: route adapters in `api/v1/`, validation/security utilities in `api/_lib/`, and focused handlers in `api/_lib/handlers/`.

## Client layers

- `app/App.tsx` performs startup checks, warms the database, and mounts `AppNavigator` only after readiness.
- `app/src/navigation/` owns tab/stack state and route rendering rather than relying on a third-party navigation framework.
- `app/src/features/` contains screen-level flows: capture, result, history, climate, chat, account, settings, and monitoring.
- `app/src/core/` contains storage, auth, sync, climate, ML contracts, severity, chat, and status logic.
- `app/src/ui/` is the shared visual system, primitives, feedback components, theme tokens, and bilingual dictionary.

## Data flow

- Capture flow stores scan metadata and local image references, invokes the staged model pipeline, computes severity, then renders a result/remedy view.
- Repositories in `app/src/core/db/repositories/` abstract SQLite tables from feature screens.
- `app/src/core/sync/` uploads queued metadata and conversations when connectivity/account conditions allow, then marks local rows synchronized.
- Chat first routes through deterministic intent matching and curated content; general questions may use the proxy provider.

## API flow

- A route in `api/v1/` passes request handling to a handler, which validates payloads with `api/_lib/validate.ts`, authenticates where required, and emits standardized responses from `api/_lib/http.ts`.
- The API service-role client bypasses RLS, so route validation and ownership checks are critical security boundaries.
- Rate limiting is implemented with `api/_lib/limits.ts` and the Supabase-backed `api/_lib/rateStore.ts`.

## Cross-cutting principles

- Truthful degradation: unavailable model stages are reported explicitly.
- Privacy by construction: photos remain on-device and location is coarse.
- Safe output: agronomic knowledge is grounded in compiled local content and guarded AI responses.
