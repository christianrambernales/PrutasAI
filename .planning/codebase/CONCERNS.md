---
mapped_at: 2026-09-15
---

# Concerns

## Release and deployment

- The repository contains a Vercel configuration but the Vercel CLI is not available in the current environment, so deployment/log/env validation is not represented by this map.
- Web SQLite depends on COOP/COEP headers and opening the proxy URL; direct Expo dev-server access can fail with a misleading `SharedArrayBuffer` error.
- Model weights are staged/generated and may be absent locally; the degradation ladder must remain truthful when they are unavailable.

## Security boundaries

- `api/_lib/supabase.ts` uses a service-role key that bypasses RLS; all route validation, authentication, and ownership checks must be maintained together with migrations.
- Client configuration may contain public Supabase values, but Gemini and service-role credentials must never enter `EXPO_PUBLIC_*` variables or bundled files.
- RLS migrations are local evidence only until applied and tested against the intended Supabase project with authenticated identities.

## Data consistency

- Root, app, and API package locks/dependencies are separate; upgrades can drift across these boundaries.
- Knowledge and model outputs are generated from source files, so stale compilation or model synchronization can produce a runtime/data mismatch.
- Sync is deliberately eventual and offline-first; retry, duplicate prevention, deletion retention, and account transitions need continued regression coverage.

## Platform complexity

- Expo SQLite has a local patch in `app/patches/`; dependency upgrades may invalidate it or change web worker behavior.
- Camera, location, secure storage, and SQLite have platform-specific behavior; Android, iOS, and web cannot be inferred from Jest alone.
- The custom navigation state and many feature contracts are well covered but remain a broad integration surface.

## Product safety

- Disease and severity outputs are decision support, not a substitute for professional agronomist diagnosis; remedy copy and uncertainty states must stay grounded.
- AI rephrasing guards protect computed verdicts/numbers, but any new assistant output shape requires corresponding guard and regression tests.
- Current tests provide strong local evidence, but real-device capture, model inference, network outage, and authenticated cloud flows require environment-specific validation.
