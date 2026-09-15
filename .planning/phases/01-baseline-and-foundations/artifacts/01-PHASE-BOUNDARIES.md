# Phase 1 Operational Boundaries and Deferred Scope

## 1. Executive Summary

Phase 1 establishes the baseline foundations, verification tooling, independent review traceability, and evidence conventions for the PrutasAI project. To preserve the integrity of the baseline and prevent premature implementation drift, this document defines the rigid operational boundaries governing what work is allowed in Phase 1, what work is strictly prohibited, the justification for Phase 1 mapping to 0 direct requirements, and the explicit deferrals to downstream phases.

---

## 2. Allowed vs. Prohibited Work in Phase 1

```
+-------------------------------------------------------------------------+
|                          PHASE 1 SCOPE GATE                             |
+------------------------------------+------------------------------------+
|            ALLOWED WORK            |          PROHIBITED WORK           |
+------------------------------------+------------------------------------+
| - Baseline inspection & hashing    | - Porting code from prototype      |
| - Prototype mapping & inventory    | - Modifying product UI/logic       |
| - Review finding extraction (24)   | - Adding UI/navigation packages    |
| - Evidence standards & conventions | - Sourcing or bundling ML weights  |
| - Baseline test validation scripts | - Mutating Supabase QA database    |
| - Documenting phase boundaries     | - Deploying to live production     |
+------------------------------------+------------------------------------+
```

### Allowed Work
1. **Repository Baseline Establishment:** Verifying directory structure, hashing critical files, and locking the initial state across root, `app/`, and `api/`.
2. **Prototype Mapping and Analysis:** Cataloging prototype files (`app.js`, `styles.css`, `index.html`), analyzing UX/FE review findings, and classifying all prototype elements by migration disposition.
3. **Traceability Ledger Creation:** Mapping all 24 independent review findings (`B-01` through `B-04`, `UX-01` through `UX-10`, `FE-01` through `FE-06`, `A11Y-01` through `A11Y-04`) to active project modules and future target phases.
4. **Evidence and Verification Infrastructure:** Standardizing evidence vocabulary (`Passed`, `Failed`, `Blocked`, `Not tested`), defining execution scopes, implementing redaction rules, and creating reproducible node-based baseline validators.
5. **Phase Boundary Governance:** Documenting explicit deferral policies and invariants to keep Phase 1 focused purely on foundations.

### Prohibited Work
1. **No Prototype Porting:** Direct copy-pasting or porting of prototype logic (`app.js`, `styles.css`) into the active React Native application is forbidden. Active code must be cleanly authored against TypeScript contracts.
2. **No Product Behavior Modifications:** Phase 1 does not fix UI glitches, alter business logic, modify database schemas, or adjust screen navigation.
3. **No New Dependencies:** No new UI component libraries, navigation frameworks, or runtime packages may be added to `package.json`, `app/package.json`, or `api/package.json` in Phase 1.
4. **No ML Model Acquisition or Weight Staging:** Do not import, mock, or download machine learning weights into `models/` or `app/assets/models/`. Model-free truthful degradation remains active.
5. **No Cloud State Mutation:** Do not alter remote Supabase QA tables, trigger destructive database migrations, or make unauthorized API calls against production endpoints.
6. **No Production Deployment:** The QA environment on Vercel remains a preview environment. No production releases or Android store publishing may be initiated.

---

## 3. Requirements Coverage Justification

### Zero Direct Requirements in Phase 1
In `.planning/REQUIREMENTS.md`, exactly 31 v1 requirements are defined across seven categories:
- Core Product Flows (6 requirements)
- Offline and Privacy (4 requirements)
- Account and Cloud Sync (4 requirements)
- Climate and Assistant Safety (4 requirements)
- Future ML Import Readiness (4 requirements)
- Quality and Accessibility (4 requirements)
- Deployment Preparation and Documentation (5 requirements)

**Phase 1 maps to 0 direct requirements.** Every requirement in `REQUIREMENTS.md` maps directly to an execution phase between Phase 2 and Phase 7:
- Phase 2: 4 requirements (`FLOW-03`, `OFFL-01`, `OFFL-02`, `OFFL-03`)
- Phase 3: 5 requirements (`OFFL-04`, `SYNC-01`, `SYNC-02`, `SYNC-03`, `SYNC-04`)
- Phase 4: 5 requirements (`FLOW-01`, `FLOW-02`, `FLOW-04`, `FLOW-05`, `FLOW-06`)
- Phase 5: 4 requirements (`SAFE-01`, `SAFE-02`, `SAFE-03`, `SAFE-04`)
- Phase 6: 4 requirements (`MLRD-01`, `MLRD-02`, `MLRD-03`, `MLRD-04`)
- Phase 7: 9 requirements (`QUAL-01`..`QUAL-04`, `DEPL-01`..`DEPL-05`)

### Rationale
Phase 1 delivers cross-cutting structural integrity:
- Establishes the baseline hash manifests that downstream phases will verify against.
- Creates the schema and evidence validation tooling used to audit acceptance criteria in all subsequent phases.
- Translates the 24 independent review findings into actionable work items tracked by future plans.
Without Phase 1, subsequent phase work would lack immutable baseline points, risk silent regressions, and lack deterministic evidence standards.

---

## 4. Structured Deferral Table

Every domain capability and environment verification not executed in Phase 1 is systematically deferred to its authoritative milestone phase:

| Capability / Verification Domain | Phase 1 Status | Target Phase | Target Plan / Milestone | Rationale for Deferral |
|---|---|---|---|---|
| Native SQLite Storage & Migrations | Not tested | **Phase 2** | `02-01-PLAN` | Requires deterministic database schema migration, seed verification, and storage driver contracts. |
| Coarse Location & Privacy Enforcement | Not tested | **Phase 2** | `02-02-PLAN` | Privacy-compliant geocoding and rounding must integrate with repository persistence. |
| Offline Knowledge Browser | Not tested | **Phase 2** | `02-03-PLAN` | Requires compiled agronomic database verification without network access. |
| Cloud Sync Engine & RLS Policies | Not tested | **Phase 3** | `03-01-PLAN` | Requires authenticated QA Supabase environment and idempotent sync queue logic. |
| Account Lifecycle & Auth Flows | Not tested | **Phase 3** | `03-02-PLAN` | User session management and credential handling must be secured against cloud backend. |
| Capture Flow & Truthful Model-Unavailable UX | Not tested | **Phase 4** | `04-01-PLAN` | Camera/gallery interaction and honest status disclosure depend on navigation state. |
| Multi-Checkpoint Monitoring Workflows | Not tested | **Phase 4** | `04-02-PLAN` | Longitudinal tracking requires persisted scan baseline from Phase 2. |
| Assistant Conversation Drawer & History Management | Not tested | **Phase 4** | `04-03-PLAN` | Chat UI persistence and recovery state depend on conversation repositories. |
| Grounded Bilingual Assistant & LLM Guardrails | Not tested | **Phase 5** | `05-01-PLAN` | Semantic grounding, safety boundaries, and prompt defense require knowledge integration. |
| Climate Suitability & Safety Copy | Not tested | **Phase 5** | `05-02-PLAN` | Agronomic advisory validation requires domain copy and weather fallback logic. |
| ML Import Pipeline & Model Synchronization | Not tested | **Phase 6** | `06-01-PLAN` | Model weight verification, tensor shape validation, and `.tflite` staging require pipeline tooling. |
| Cross-Platform UI Polish & Accessibility (WCAG) | Not tested | **Phase 7** | `07-01-PLAN` | Focus trapping, screen reader announcements, and zero-overflow layout require stable feature UI. |
| Android Native APK Assembly & Release Profile | Not tested | **Phase 7** | `07-02-PLAN` | Prebuild, signing configuration, and native binary validation occur in final deployment phase. |
| Vercel Deployment Hardening & Security Headers | Not tested | **Phase 7** | `07-03-PLAN` | COOP/COEP header enforcement, edge rate-limiting, and operational runbooks conclude deployment readiness. |

---

## 5. Out-of-Scope Declarations

The following items are permanently out of scope for the current milestone (v1) and will not be executed in any phase of this project:

1. **Live Production Release:**
   - The active Vercel deployment serves solely as a staging/QA environment. No public production domain or store release will be published.
2. **Model Training and Weight Generation:**
   - Computer vision models will not be trained, fine-tuned, or evaluated from scratch. The system is designed to ingest externally approved `.tflite` model files when supplied by the project owner.
3. **In-App Model Marketplace or Remote Model Downloads:**
   - The application does not include an in-app download manager or remote weights marketplace. Model weights are bundled via repository staging and synchronization scripts.
4. **Mandatory Cloud Requirements:**
   - Cloud connectivity will never be made mandatory for core diagnostics, knowledge lookup, or scan history. Offline functionality is a non-negotiable core value.
5. **Expansion Beyond Initial Fruit / Disease Scope:**
   - Domain hardening focuses strictly on the currently supported Philippine fruit crops (e.g., Mango, Banana, Papaya, Citrus). Adding new agricultural commodities is deferred to future milestones (v2).
