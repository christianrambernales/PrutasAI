# Phase 03 Evidence Ledger

Observed: 2026-09-20 UTC. Build baseline: `0e390eb`; working tree: dirty (Phase 03 implementation and pre-existing user changes). No secret-bearing output is recorded.

**Verification Status:** Local direct-RPC grant remediation verified on 2026-09-20; Phase 3 is **Remediation required**, not overall PASS. See [03-VERIFICATION-REPORT.md](./03-VERIFICATION-REPORT.md). Disposable migration rehearsal is **Blocked** and authenticated two-account/anonymous PostgREST plus API QA is **Not tested**.

## Local Automated Checks

| Command | Target class | Result | Verdict |
| --- | --- | --- | --- |
| `npm --prefix app run typecheck` | local-static | Passed after Phase 03 ownership/retry changes | Passed |
| Focused auth/sync Jest suites | local-test | Restore, retry, drain, and account lifecycle checks passed | Passed |
| `npm --prefix api test` | local-test | 89 API tests passed after error-log redaction | Passed |
| `node --test scripts/validate-migrations.test.mjs` | local-test | 221/221 owner-bound execute-grant regressions passed: all three RPCs × PUBLIC/anon/authenticated across qualified, legacy bare, unqualified, quoted, mixed-quoted, spaced/multiline, and nested block-comment identifier forms | Passed |
| `node scripts/validate-migrations.mjs` | local-static | Exact-signature PUBLIC/anon/authenticated revocations and service_role-only grants validated for 0007 | Passed |
| `npm --prefix api test -- __tests__/ownershipSecurity.test.ts` | local-test | 37/37 bearer-derived owner and adversarial ownership checks passed | Passed |

## Migration Rehearsal

| Target | Manifest | Result | Verdict |
| --- | --- | --- | --- |
| Disposable/restored Supabase target | `0001`–`0007`, hashes in `docs/03-MIGRATION-REHEARSAL.md` | No authorized identified disposable target or backup/restore evidence supplied | Blocked |

## Authenticated QA

| Identities/path | Result | Verdict |
| --- | --- | --- |
| Account A, Account B, Anonymous; PostgREST and service-role API | No credentials, target, or authorization supplied; matrix is in `docs/03-QA-MATRIX.md` | Not tested |

## Evidence gaps

Live migration, RLS, cross-account, provider, device, and deployed-QA claims remain unpassed. This ledger records only local commands actually run in this checkout.
