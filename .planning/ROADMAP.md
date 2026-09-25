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
| 6 | File-Based ML Readiness | Make future `.tflite` import deterministic without requiring weights now | MLRD-01–04 | ◐ 5/5 local plans; owner/model/device gates open |
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

**Plans:** 7/8 plans complete
- [x] 03-01-PLAN.md — Implement confirmation-aware authentication, safe bilingual errors, session restore, and non-destructive sign-out.
- [x] 03-02-PLAN.md — Complete neutral password recovery with secure Android/web deep-link handling and password update UI.
- [x] 03-03-PLAN.md — Add and register local SQLite account partitioning plus explicit sync/retry state repositories.
- [x] 03-04-PLAN.md — Wire account scope, explicit unowned claiming, sync pause/resume, and truthful account status through the app.
- [x] 03-05-PLAN.md — Implement privacy-safe owner-scoped drains, deterministic restore, needs-attention routing, and real retry scheduling.
- [x] 03-06-PLAN.md — Add the remote sync-contract migration and atomic service-role ownership enforcement with adversarial tests.
- [x] 03-07-PLAN.md — Document and record migration rehearsal, two-account QA, and evidence-scope protocols without mutating QA.
- [ ] 03-08-PLAN.md — Perform only explicitly authorized disposable/restored migration rehearsal and authenticated Account A/B/anonymous PostgREST plus API QA closure; no summary exists until direct evidence is captured.

**Closure status:** **Remediation required.** The local 0007 source contract now revokes direct PUBLIC/anon/authenticated execution of the owner-bound SECURITY DEFINER RPCs and grants only `service_role`; local grant regression and focused ownership checks pass. This is not remote proof: disposable migration rehearsal is **Blocked** and authenticated two-account/anonymous PostgREST plus API QA is **Not tested**. Phase 4 remains blocked until that authorized evidence exists.

### Phase 4: Complete Product Flows
**Goal:** Finish navigation and the complete offline, future-diagnostic, and cloud-assisted product journeys.
**Requirements:** FLOW-01, FLOW-02, FLOW-04, FLOW-05, FLOW-06
**Success Criteria:**
1. Onboarding and every current tab/detail route reach a usable destination with correct back behavior.
2. Capture without models produces a truthful result, saves locally, appears in history, and supports monitoring.
3. Conversations support continuation, rename, recovery, and permanent deletion according to documented retention behavior.
4. Loading, empty, unavailable, offline, and error states are visible and actionable throughout the flows.

**Plans:** 13 plans
- [ ] 04-12-PLAN.md — Fail closed unless separate Phase 3 evidence and closure artifacts establish every D-17 prerequisite.
- [ ] 04-01-PLAN.md — Prove persisted onboarding entry and deterministic Back navigation through TDD.
- [ ] 04-02-PLAN.md — Furnish bilingual onboarding, Phase 4 copy, and the Home journey launcher.
- [ ] 04-03-PLAN.md — Add non-destructive post-onboarding offline/account mode changes.
- [ ] 04-04-PLAN.md — Add the durable scoped local monitoring migration and repository through TDD.
- [ ] 04-05-PLAN.md — Derive the observation-only Day 1/5/10 timeline through TDD.
- [ ] 04-06-PLAN.md — Make camera, gallery, and checkpoint capture target-aware and recoverable through TDD.
- [ ] 04-07-PLAN.md — Complete truthful no-model result and History reopen flows with the persisted monitoring handoff.
- [ ] 04-08-PLAN.md — Complete blank-first Chat entry and visible saved-conversation discovery.
- [ ] 04-13-PLAN.md — Complete the scoped Day 1/5/10 monitoring controller, photo lifecycle, routing, and observation UI.
- [ ] 04-10-PLAN.md — Furnish the exhaustive current tab/detail route and five-state behavior matrix.
- [ ] 04-11-PLAN.md — Complete offline conversation naming, Trash recovery, and confirmed permanent deletion.
- [ ] 04-09-PLAN.md — Run the final scoped automated/runtime evidence gate across all 13 plans and preserve the Phase 3 evidence boundary.

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

**Plans:** 5/5 plans executed. Focused local contract/status checks, root typecheck, repeated empty-manifest sync, model-free web export, and Android configuration parsing passed. The full root suite failed on the `fruitPapaya` Filipino translation assertion; a separate API run passed 157/157. Owner-approved model import, positive real LiteRT inspection, browser runtime, Android package/device checks, and inference remain open. See [06-EVIDENCE.md](./phases/06-file-based-ml-readiness/06-EVIDENCE.md) and [06-VERIFICATION.md](./phases/06-file-based-ml-readiness/06-VERIFICATION.md).

**Wave 1**
- [x] 06-01-PLAN.md — Define the owner-approved import contract and fail-closed manifest validator.

**Wave 2** *(after 06-01)*
- [x] 06-02-PLAN.md — Inspect real `.tflite` tensors and publish synchronized assets and metadata transactionally.

**Wave 3** *(after 06-02)*
- [x] 06-03-PLAN.md — Project verified roles by fruit without turning file validation into inferred diagnosis.

**Wave 4** *(after 06-03)*
- [x] 06-04-PLAN.md — Present bilingual model status and document the owner's later import procedure.

**Wave 5** *(after implementation)*
- [x] 06-05-PLAN.md — Record scope-separated local, build, owner, and device evidence and verify MLRD-01–04.

**Cross-cutting constraints:** Preserve the empty model-free build, stop and retain the prior generated bundle on any failed nonempty import, require recorded owner approval and real tensor inspection, report partial validated roles by fruit, and keep inference unverified until direct device evidence exists.

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
