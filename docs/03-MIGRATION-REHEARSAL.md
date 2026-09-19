# Phase 03 migration rehearsal and rollback

## Boundary and authorization

This runbook is for a **disposable Supabase project or restored clone only**. It does not authorize any change to the PrutasAI QA project. Before an operator runs it, record the target project reference, written authorization, UTC start time, operator, and confirmation that the target is disposable/restorable. Do not record URLs containing credentials, tokens, or connection strings.

Prerequisites are a verified backup/export, a separately tested restore into the disposable target, Supabase CLI authenticated by the operator outside this repository, and an empty/known target. If any prerequisite is absent, verdict is **Blocked**.

## Ordered SHA-256 manifest

| Order | Migration | SHA-256 |
| --- | --- | --- |
| 1 | `0001_scan_and_rate_hit.sql` | `63e2c63ba022f4e88c94aa7f097bd8ae864bd73ff6a1eb2b07aa7ef74742e3f1` |
| 2 | `0002_scan_location.sql` | `da9d52eddb6c9cb23300193819b4d413f12e1b5d75cb4b060e45c59408dcbb1f` |
| 3 | `0003_profile_and_owned_scans.sql` | `d5962f7608419fa7107f34bfe8548ca6be5bf1b73772b5e0ec492638ca71bfd6` |
| 4 | `0004_conversations.sql` | `8702f759830f054e1e124d6f2684931ce30c98df4e284956476464fbcd08b48d` |
| 5 | `0005_conversation_policy_hardening.sql` | `9c6478475ac75b81fac621c760c35ab33e62ff5432f072fc4a3a90599f0de6e4` |
| 6 | `0006_scan_policy_hardening.sql` | `6be3f67fcb7e81a1ccc36bfac2d66c748ac34d5b8cabb1b726eeed794ec86285` |
| 7 | `0007_owner_bound_sync_contract.sql` | `eb9d05ea8073a3b5d9d12a054c475be96621616da0998e9de1c16c4621af732e` |

Recompute before execution with `Get-FileHash -Algorithm SHA256 supabase/migrations/000*.sql`. Stop on any mismatch.

## Disposable rehearsal

1. Identify the disposable target and prove backup restoration works there.
2. Apply migrations in the exact manifest order using the operator-approved CLI workflow.
3. Audit schema: `scan`, `profile`, `sync_state`, `conversation`, `conversation_message`, `rate_hit`; ownership, timestamp, deletion, retry, and sync-status columns; required indexes and foreign keys.
4. Audit grants and RLS policies: anonymous access is denied where intended; authenticated access is own-row only; service-role API paths validate ownership before using privileged access.
5. Run the sanitized two-account matrix in `docs/03-QA-MATRIX.md`, including negative forged-owner, parent mismatch, replay, and anonymous cases.
6. Capture only status, row counts, object names, policy names, and redacted request/response metadata in the evidence ledger.

## Rollback

1. Stop the rehearsal and preserve its sanitized evidence.
2. Restore the verified pre-change backup to the disposable target; do not attempt improvised down migrations against QA.
3. Re-run schema/grant/policy assertions against the restored target and record the result.
4. If rollback or verification fails, classify as **Failed**, retain the target for investigation, and do not request QA application.

## Go / no-go

Go only when hashes match, backup restore passed, disposable migration and schema/policy audits passed, and every applicable QA-matrix result is recorded. Real QA remains blocked until a target and explicit authorization are provided.
