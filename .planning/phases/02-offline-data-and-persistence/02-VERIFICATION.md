# Phase 2: Offline Data and Persistence - Verification

**Overall Phase Status:** `Needs Review / Partial`

The locally actionable implementation gaps found during independent review were repaired on 2026-09-17. Phase closure is still blocked by approved agricultural content and environment-specific Android/isolated-web evidence.

## Requirement Verdicts

| Requirement | Description | Status | Evidence Scope | Limitations / Gaps |
|-------------|-------------|--------|----------------|--------------------|
| **FLOW-03** | A user can browse supported crop, variety, disease, remedy, and source information from locally compiled knowledge without network access. | `Blocked` | `local-test`, `local-static` | Structural logic handles truthful empty states, but approved disease/remedy rows do not exist yet. Cannot be marked Passed until agricultural content is populated. |
| **OFFL-01** | Core guidance, local history, deterministic assistant responses, settings, and model-unavailable flows remain usable without network access. | `Not tested` | `local-test`, `local-static` | All local suites and the web export pass, including the repaired capture/history UI integration. The reproducible app-scoped Android export failed, and physical Android and served isolated-web offline behavior remain untested. |
| **OFFL-02** | Local database startup, migrations, seed loading, and failure states are deterministic on Android and web. | `Not tested` | `local-test`, `local-static` | Startup now awaits warm-up, migration, and seed completion; rollback/retry tests and the web export pass. `npm --prefix app exec expo export -- --platform android` fails because no Metro platforms are configured, so Android static export and native Android runtime evidence are not established; served COOP/COEP runtime evidence is also absent. |
| **OFFL-03** | Scan photographs never leave the device through sync or API payloads, and stored location is coarse/rounded according to the privacy contract. | `Passed` | `local-test`, `local-static` | Metadata-only serialization, restored-setting normalization, per-scan rounding, owned-file namespace guards, and safe URI extension handling are directly tested. Physical FileSystem behavior remains an environment-specific smoke check, not contradictory evidence. |

## Goal-Backward Assessment

- **Database startup, migrations, seeding, rollback, and retry are deterministic.**
  The startup gate now receives a fully opened, migrated, and seeded driver. Failed preparation is not cached and retry is non-destructive. Seed and migration failures roll back without destroying user data, proved locally via failure injection. Android and isolated-browser runtime checks remain `Not tested`.
- **Knowledge browsing contains cited disease/remedy contracts and truthful empty states.**
  Filipino/English primary-name selection and claim-adjacent disease/remedy citations are wired and tested. Actual approved disease/remedy text is still missing from production YAML, so FLOW-03 cannot be `Passed`.
- **Persistent app-owned photos, scan retention primitives, and privacy.**
  The privacy contract (OFFL-03) is enforced structurally in the `drain.ts` layer. Photos are correctly segregated into an app-owned document path and removed upon permanent scan deletion.

## Remediation Plan

1. **FLOW-03 — open:** Await agricultural approval and population of disease/remedy data into `knowledge/taxonomy.yaml` (expected Phase 5).
2. **OFFL-01 UI regressions — closed:** Capture/no-model/history interactions now pass.
3. **OFFL-02 — open:** Validate database startup in an actual isolated browser environment and a physical Android handset in Phase 7.
4. **Android / Isolated Browser Testing — open:** Execute the project device/runtime matrix when those environments are available.
