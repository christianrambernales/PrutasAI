# PrutasAI Roadmap

**Created:** 2026-09-15
**Granularity:** Standard
**Structure:** Horizontal layers
**Execution:** Parallel where phase dependencies permit

## Overview

PrutasAI will be completed through seven layered phases. The order moves from reproducible foundations and local data through cloud security, user-facing flows, safety-sensitive domains, future ML activation, and final release evidence. No phase includes live production promotion or ML model creation.

| Phase | Name | Goal | Requirements | Progress |
|------:|------|------|--------------|----------|
| 1 | Baseline and Foundations | Establish a reproducible, observable baseline for the existing app | Cross-cutting support for all phases | ● 100% |
| 2 | Offline Data and Persistence | Make local knowledge, database startup, privacy, and offline behavior dependable | FLOW-03, OFFL-01–03 | ● 100% |
| 3 | Cloud, Auth, and Sync Security | Make optional accounts and synchronization safe and recoverable | OFFL-04, SYNC-01–04 | ○ 0% |
| 4 | Complete Product Flows | Finish navigation and end-to-end offline/future-diagnostic/cloud UI flows | FLOW-01–02, FLOW-04–06 | ○ 0% |
| 5 | Assistant, Climate, and Safety | Verify grounded guidance, climate evidence, and guarded assistant behavior | SAFE-01–04 | ○ 0% |
| 6 | File-Based ML Readiness | Make future `.tflite` import deterministic without requiring weights now | MLRD-01–04 | ○ 0% |
| 7 | QA, Accessibility, and Release Preparation | Produce deployment-ready evidence, builds, accessibility, and operations handoff | QUAL-01–04, DEPL-01–05 | ○ 0% |

## Phase Details

### Phase 1: Baseline and Foundations
**Goal:** Establish a reproducible, observable baseline for the existing app before layered changes begin.
**Success Criteria:**
1. A clean checkout can install dependencies, compile knowledge, synchronize model metadata, typecheck, and run the documented automated suites.
2. Existing behavior, configuration, generated artifacts, and known gaps are recorded as a baseline with no secrets included.
3. Phase boundaries and verification evidence conventions are ready for subsequent work.
**Plans:** 4 plans
- [x] 01-01-PLAN.md — Build tested isolated-baseline execution, evidence schema, finding traceability, and prototype-mapping validators.
- [x] 01-02-PLAN.md — Map prototype screens, tokens, interactions, and review findings to active Expo modules and future phases.
- [x] 01-03-PLAN.md — Run the Phase 1 baseline safely in an isolated clean worktree, publish reproducible evidence, and complete the source audit.
- [x] 01-04-PLAN.md — Close clean-checkout typecheck and test reproducibility gaps found during independent verification.

### Phase 2: Offline Data and Persistence
**Goal:** Make local knowledge, database startup, privacy, and offline behavior dependable without ML weights or network access.
**Requirements:** FLOW-03, OFFL-01, OFFL-02, OFFL-03
**Success Criteria:**
1. A user can browse compiled agricultural content and use deterministic core guidance offline.
2. Android and web database startup, migration, seed, and failure states are deterministic and actionable.
3. Scan photos remain local and saved coordinates follow the coarse-location contract.

**Plans:**
- [x] 02-01-PLAN.md — Make database startup, migrations, seeding, rollback, and bilingual retry deterministic and non-destructive.
- [x] 02-02-PLAN.md — Extend compiled fruit-first knowledge browsing with cited disease/remedy contracts and truthful approval-gated empty states.
- [x] 02-03-PLAN.md — Enforce persistent app-owned photos, scan retention primitives, coarse location, and image-free sync payloads.
- [x] 02-04-PLAN.md — Run full Phase 2 verification and publish evidence-scoped requirement verdicts.

### Phase 3: Cloud, Auth, and Sync Security
**Goal:** Make optional accounts and synchronization safe, recoverable, and provably owner-scoped.
**Requirements:** OFFL-04, SYNC-01, SYNC-02, SYNC-03, SYNC-04
**Success Criteria:**
1. Sign-up, sign-in, restore, password recovery, and sign-out work with clear bilingual errors.
2. A signed-in QA identity can sync and restore only its own eligible records; unauthorized and offline failures preserve local data.
3. Migration order, grants, RLS policies, service-role boundaries, and QA evidence are documented.

### Phase 4: Complete Product Flows
**Goal:** Finish navigation and the complete offline, future-diagnostic, and cloud-assisted product journeys.
**Requirements:** FLOW-01, FLOW-02, FLOW-04, FLOW-05, FLOW-06
**Success Criteria:**
1. Onboarding and every current tab/detail route reach a usable destination with correct back behavior.
2. Capture without models produces a truthful result, saves locally, appears in history, and supports monitoring.
3. Conversations support continuation, rename, recovery, and permanent deletion according to documented retention behavior.
4. Loading, empty, unavailable, offline, and error states are visible and actionable throughout the flows.

### Phase 5: Assistant, Climate, and Safety
**Goal:** Verify grounded guidance, climate evidence, and guarded assistant behavior across supported languages and failure states.
**Requirements:** SAFE-01, SAFE-02, SAFE-03, SAFE-04
**Success Criteria:**
1. Climate views distinguish current/stale/error data from historical suitability evidence and do not invent missing verdicts.
2. Deterministic assistant answers remain grounded; proxy and Gemini failures are explicit and recoverable.
3. Rephrasing cannot change diagnoses, severity, numerical claims, remedies, or safety advisories under adversarial/malformed inputs.
4. Disease, mold, rot, severity, remedy, and uncertainty language consistently communicates decision-support limits.

### Phase 6: File-Based ML Readiness
**Goal:** Make future `.tflite` import deterministic, validated, and automatically reflected in app capabilities.
**Requirements:** MLRD-01, MLRD-02, MLRD-03, MLRD-04
**Success Criteria:**
1. Documentation identifies the approved model filenames, roles, placement under `models/`, and synchronization command.
2. Synchronization validates artifact presence, metadata, checksums, versions, and expected shapes, failing clearly when invalid.
3. Generated metadata drives capability exposure while preserving truthful partial/no-model degradation.
4. A model-free build remains reproducible and demonstrable, and the owner’s future import action is unambiguous.

### Phase 7: QA, Accessibility, and Release Preparation
**Goal:** Produce deployment-ready evidence, builds, accessibility, and operations handoff without live production promotion.
**Requirements:** QUAL-01–04, DEPL-01–05
**Success Criteria:**
1. Screens and controls meet the project’s accessibility, bilingual, contrast, and supported-size expectations.
2. Automated tests/typechecks and documented Android/web/offline/network/no-model/account smoke checks pass or have explicit blockers.
3. The Vercel QA build, environment-variable matrix, COOP/COEP behavior, health/log checks, and rollback/readiness procedure are documented.
4. A reproducible Android preview/release artifact can be validated without store publication, and the operational handoff identifies remaining production gates.

## Dependencies and Parallelization

- Phase 1 precedes all other phases.
- Phases 2 and 3 can proceed in parallel after Phase 1; Phase 3 depends on Phase 2’s persistence contracts.
- Phase 4 depends on the stable local contracts from Phases 2–3.
- Phase 5 can proceed alongside late Phase 4 work once its data and UI contracts are stable.
- Phase 6 can proceed independently after Phase 1, with final integration checks in Phase 7.
- Phase 7 is the final release-readiness gate and consumes evidence from every earlier phase.

## Out of Scope

- Live Vercel production deployment or store publication.
- Training, evaluating, or creating ML weights.
- In-app model marketplace or remote model delivery.

---
*Last updated: 2026-09-15 after roadmap creation*
