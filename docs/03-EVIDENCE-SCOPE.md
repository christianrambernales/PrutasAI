# Phase 03 evidence scope and redaction

## Verdict vocabulary

`Passed` means the named command ran in its stated scope. `Failed` means it ran and did not satisfy its assertions. `Blocked` means a required target, authorization, identity, credential, or network prerequisite was missing. `Not tested` is never inferred from local success.

| Scope | What it can prove | What it cannot prove |
| --- | --- | --- |
| Local Automated Checks | Type contracts, mock-backed state transitions, API handlers | A deployed database policy or authenticated provider behavior |
| Migration Rehearsal | A named disposable/restored target and ordered migration chain | QA deployment readiness |
| Authenticated QA | Named A/B/anonymous identities against an authorized target | Android or production deployment behavior |

Allowed evidence is UTC date, commit, dirty-tree declaration, command, target class, migration hash, identity labels (`Account A`, `Account B`, `Anonymous`), HTTP status, row counts, object/policy names, and redacted failure category.

Never write passwords, bearer tokens, JWTs, API keys, service-role values, full provider/database output, connection strings, or personal email addresses. Replace sensitive values with `[REDACTED]`; redact headers except names and status.
