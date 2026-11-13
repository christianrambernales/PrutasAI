# PrutasAI

## What This Is

PrutasAI is an offline-first agricultural decision-support application for Filipino farmers, agricultural extension workers, researchers, and fruit cultivators. It combines local crop and disease knowledge, climate suitability guidance, capture/history/monitoring flows, a grounded bilingual assistant, optional cloud synchronization, and a future on-device ML diagnostic pipeline in one Android and web-capable product.

This project phase finishes and furnishes every non-ML part of the product for thesis/demo use and deployment readiness. The existing Vercel deployment remains a QA environment; this phase prepares but does not publish a live production release. Approved ML models remain a future file-import step.

## Core Value

Users can make a trustworthy, useful agricultural decision offline, with every unavailable capability clearly disclosed instead of guessed or fabricated.

## Requirements

### Validated

<!-- Existing capabilities inferred from the brownfield codebase map. These are existing, not live-production verification claims. -->

- ✓ Offline-first local SQLite persistence with migrations, compiled knowledge seed data, history, trash/recovery, and synchronization queues — existing
- ✓ Expo Android/web client with custom navigation, onboarding, bilingual English/Filipino UI, shared design system, and feature screens — existing
- ✓ Crop, variety, disease, remedy, climate, and source knowledge structure under `knowledge/`, with compilation tooling — existing
- ✓ Capture, result, severity, monitoring, model-status, and truthful model-degradation contracts — existing
- ✓ Deterministic grounded assistant with guarded online Gemini proxy fallback — existing
- ✓ Optional Supabase authentication, owned cloud data, conversation/scan sync, and RLS migration history — existing
- ✓ Vercel QA configuration and Android EAS/build configuration — existing
- ✓ Broad Jest, Vitest, and Node test coverage for client, API, scripts, storage, sync, chat, security boundaries, and UI contracts — existing

### Active

- [ ] Complete and verify all non-ML screens and user flows end-to-end, including offline farmer, future diagnostic, and cloud-assisted journeys.
- [ ] Ensure every model-dependent path is truthful and useful when no ML weights are installed.
- [ ] Make file-based `.tflite` import the final integration step: documented model placement, synchronization, checksum/version validation, bundling, and automatic capability exposure.
- [ ] Harden the application for deployment readiness without performing a live production release.
- [ ] Validate Vercel QA configuration, environment-variable boundaries, API behavior, Supabase schema/RLS assumptions, and authenticated ownership flows where test access is available.
- [ ] Validate reproducible Android and web builds, including SQLite web isolation requirements and model-free fallback behavior.
- [ ] Finish accessibility, responsive/platform behavior, error handling, loading/empty/offline states, and bilingual copy across the full app.
- [ ] Produce operational documentation for setup, QA, builds, model import, environment configuration, rollback/readiness checks, and known limitations.
- [ ] Maintain thesis/demo polish with deterministic, reproducible demonstrations that do not require ML weights.

### Out of Scope

- Live production deployment or promotion of the current Vercel QA deployment — this phase prepares release readiness only.
- Training, evaluating, or creating ML models — model weights are supplied later by the project owner.
- An in-app model marketplace or user-facing model download system — the approved workflow is file-based import through the repository's documented models directory.
- Expanding beyond the current supported fruit/domain scope without an explicit requirements decision — scope control is needed while hardening the existing product.
- Replacing the offline-first architecture with mandatory accounts, mandatory network access, or a cloud-only workflow — reliability and privacy depend on local operation.

## Context

- The repository is a brownfield split application: Expo/React Native client in `app/`, Vercel Functions API in `api/`, source knowledge in `knowledge/`, ML utilities in `ml/`, model staging in `models/`, scripts in `scripts/`, and Supabase migrations in `supabase/migrations/`.
- The client uses local SQLite as its primary store and can optionally synchronize metadata and conversations to Supabase. Scan photographs must remain on-device.
- The assistant uses deterministic intent matching and curated content first; the online Gemini path is proxied through the API and must not expose provider credentials to the client.
- The current codebase map is documented in `.planning/codebase/`. It identifies strong local test coverage and important environment-specific gaps: real-device behavior, authenticated cloud validation, deployed migration/RLS proof, Vercel environment checks, and model-present inference.
- The application supports Banana, Mango, and Papaya content and is designed for English and Filipino users in rural or connectivity-constrained settings.

## Constraints

- **ML dependency**: No model weights are available in this phase; all flows must remain complete, honest, and demonstrable without them.
- **Deployment**: Prepare and validate the existing Vercel QA deployment and build configuration, but do not deploy to live production.
- **Privacy**: Photos remain on-device, location is coarse/rounded, and service-role/provider secrets remain server-side.
- **Offline-first**: Core guidance, history, deterministic assistant behavior, and local persistence must not require a network connection.
- **Compatibility**: Preserve Android and web support, including cross-origin isolation requirements for web SQLite and Expo platform behavior.
- **Architecture**: Preserve the client/core/features/UI, API route/handler, knowledge compiler, model synchronization, and Supabase migration boundaries unless a documented decision changes them.
- **Safety**: Disease, severity, remedy, and assistant output must remain grounded, uncertainty-aware, and clearly decision-support rather than professional diagnosis.
- **Verification**: Missing live, authenticated, device, or deployment evidence is a gap to verify, not a pass inferred from local tests.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Finish all three dimensions: product shell, release readiness, and thesis/demo polish | The app must be broadly complete before future model import | — Pending |
| Prepare for deployment without live production release | Vercel is currently used for QA and production promotion is intentionally deferred | — Pending |
| Keep ML integration file-based | Approved `.tflite` files should be the final project-owner import step | — Pending |
| Treat offline, future diagnostic, and cloud-assisted journeys as equally mandatory | No single user path should conceal a missing product capability | — Pending |
| Preserve truthful model-unavailable states | Models are intentionally absent and the app must never fabricate diagnosis | — Pending |
| Preserve offline-first and optional cloud sync | Rural reliability and privacy are core product requirements | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state, feedback, and verification evidence

---
*Last updated: 2026-09-15 after initialization questioning*
