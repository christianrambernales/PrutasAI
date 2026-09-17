# Phase 2: Offline Data and Persistence - Verification

## Requirement Verdicts

| Requirement | Description | Status | Evidence Scope | Limitations / Gaps |
|-------------|-------------|--------|----------------|--------------------|
| **FLOW-03** | A user can browse supported crop, variety, disease, remedy, and source information from locally compiled knowledge without network access. | `Blocked` | `local-test`, `local-static` | Structural logic handles truthful empty states, but approved disease/remedy rows do not exist yet. Cannot be marked Passed until agricultural content is populated. |
| **OFFL-01** | Core guidance, local history, deterministic assistant responses, settings, and model-unavailable flows remain usable without network access. | `Not tested` | `local-test`, `local-static` | Local schemas and offline chat behavior are tested (`answer.ts`), but UI integration is incomplete (fails `interactions.test.tsx`). Device and web runtime behavior are completely untested. |
| **OFFL-02** | Local database startup, migrations, seed loading, and failure states are deterministic on Android and web. | `Not tested` | `local-test`, `local-static` | Tests verify the transactional wrapper for migrations and seed rollback in Node.js, but native Android `expo-sqlite` and Web SQL with COOP/COEP isolation lack runtime evidence. |
| **OFFL-03** | Scan photographs never leave the device through sync or API payloads, and stored location is coarse/rounded according to the privacy contract. | `Passed` | `local-test`, `local-static` | The `drain.test.ts` suite explicitly validates that `image_uri` and `image_bytes` are stripped from sync payloads. Coarse coordinate formatting is asserted in unit tests. |

## Goal-Backward Assessment

- **Database startup, migrations, seeding, rollback, and retry are deterministic.**
  The database core is wrapped in safe transactions. Seed and migration failures roll back without destroying user data, proved locally via failure injection. However, Android and isolated browser checks remain `Not tested`.
- **Knowledge browsing contains cited disease/remedy contracts and truthful empty states.**
  The structural foundations are in place, but since actual disease and remedy text is missing from the YAML, we cannot claim FLOW-03 is `Passed`.
- **Persistent app-owned photos, scan retention primitives, and privacy.**
  The privacy contract (OFFL-03) is enforced structurally in the `drain.ts` layer. Photos are correctly segregated into an app-owned document path and removed upon permanent scan deletion.

## Remediation Plan

1. **FLOW-03**: Await agricultural approval and population of disease/remedy data into `knowledge/taxonomy.yaml` (expected Phase 5).
2. **OFFL-01**: Fix the UI test regressions in Phase 4 once the visual flows are fully built out.
3. **OFFL-02**: Validate database startup in an actual isolated browser environment and a physical Android handset in Phase 7.
4. **Android / Isolated Browser Testing**: A comprehensive device matrix and live testing strategy must be developed by the Project Owner.
