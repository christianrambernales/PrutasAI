# Evidence Conventions and Verification Standards

## 1. Status Vocabulary

Every verification record, test result, and capability assertion across all GSD phases must evaluate to exactly one of four canonical statuses:

| Status | Definition | Criteria and Invariants |
|---|---|---|
| `Passed` | The target command, test, or capability was executed in the designated scope and satisfied all assertions without errors, unhandled exceptions, or bypassed validation gates. | **Requires:** Valid `scope`, build metadata (`commit` and `dirty`), ISO 8601 timestamp (`observedAt`), and an explicit evidence reference (`command` or `artifact`). Cannot be claimed from inference alone. |
| `Failed` | The target command or capability was executed, but failed assertions, returned a non-zero exit code, produced unhandled exceptions, or violated expected contracts. | **Requires:** Failure log or error excerpt, scope, build metadata, timestamp, and actionable failure description. |
| `Blocked` | The test or verification cannot be executed because a mandatory prerequisite (e.g., physical hardware, authenticated cloud account, external secret, model weights) is unavailable. | **Requires:** Reason for blockage, missing prerequisite, and the owning role or future phase dependency. A blocked check must **never** be coerced into `Passed`. |
| `Not tested` | The capability, platform variant, or edge condition has not been evaluated in the current phase or execution context. | Default state for downstream capabilities, deferred platforms, or scenarios outside the active plan scope. |

### Invariant Rules
- **No Inferred Success:** Passing a `local-test` suite does not prove `web-runtime`, `android-device`, or `deployed-qa` functionality.
- **Truthful Degradation:** When an external dependency or hardware feature is absent, the status must remain `Blocked` or `Not tested`. It is strictly prohibited to fabricate mock success to achieve a green report.

---

## 2. Evidence Scopes

Evidence must always declare its operational boundary. Six distinct scopes partition the verification surface:

```
+-------------------------------------------------------------------------+
|                              deployed-qa                                |
|  (Live Vercel Preview deployment, edge network, security headers)       |
+------------------------------------+------------------------------------+
|          authenticated-qa          |           android-device           |
|  (Live Supabase Auth, DB, Sync)    |  (Physical handset, native sensor) |
+------------------------------------+------------------------------------+
|            web-runtime             |             local-test             |
|  (Chromium/Browser DOM, Web SQL)   |  (Jest, Vitest, Node Test Runner)  |
+------------------------------------+------------------------------------+
|                              local-static                               |
|  (TypeScript typecheck, linter, file hashing, schema/syntax audit)      |
+-------------------------------------------------------------------------+
```

### Scope Definitions

1. **`local-static`**
   - **Environment:** Offline developer workstation or CI runner; no runtime process or network socket.
   - **Applicability:** Type-checking (`npm run typecheck`), linting, file hashing (`verify-baseline.mjs`), JSON/YAML syntax validation, and code-level invariant audits.
   - **Deliverables:** Static analysis logs, hash manifests, syntax verification results.

2. **`local-test`**
   - **Environment:** Node.js test runners (`node:test`, `vitest`, `jest-expo`) running in memory.
   - **Applicability:** Pure function testing, state-machine transitions, database query builders, mock-assisted repository tests, and validator suites.
   - **Deliverables:** Test runner reports with test counts, durations, and exit code 0.

3. **`web-runtime`**
   - **Environment:** Browser or headless Chromium runtime executing the Expo web bundle served via local dev server.
   - **Applicability:** DOM mounting, CSS/responsive reflow, browser back-button navigation, cross-origin isolation (COOP/COEP for Web SQLite), and console hygiene.
   - **Deliverables:** Browser console dumps, network inspection logs, rendered DOM snapshots.

4. **`android-device`**
   - **Environment:** Physical Android device running Android 10+ or official Android Virtual Device (AVD).
   - **Applicability:** Native hardware sensors (camera capture, orientation), native SQLite operations (`expo-sqlite`), Android back-button handling, and offline file storage.
   - **Deliverables:** Logcat excerpts, APK build artifacts, physical device inspection checklists.

5. **`authenticated-qa`**
   - **Environment:** Client runtime connected to live Supabase QA project with valid test credentials.
   - **Applicability:** User sign-up/login, session refresh, Row Level Security (RLS) enforcement, authenticated metadata sync, and cloud soft-delete propagation.
   - **Deliverables:** Network transaction logs (headers redacted), database state snapshots, sync conflict resolution traces.

6. **`deployed-qa`**
   - **Environment:** The live Vercel QA deployment preview (`https://prutasai-*.vercel.app`).
   - **Applicability:** Serverless API function execution, rate limiting store integration, production asset delivery, and end-to-end cloud communication.
   - **Deliverables:** HTTP response codes, latency metrics, serverless function execution logs.

---

## 3. Environment and Build Metadata

All `Passed` and `Failed` evidence records must bind to an immutable build identity and environment snapshot:

```typescript
interface BuildMetadata {
  commit: string;      // 7 to 40-character Git commit SHA
  dirty: boolean;      // True if working tree contained uncommitted changes
  branch?: string;     // Active Git branch name
  nodeVersion: string; // process.version (e.g., "v22.12.0")
  npmVersion?: string; // npm --version (e.g., "10.9.0")
  os: string;          // process.platform (e.g., "win32", "linux", "darwin")
  arch: string;        // process.arch (e.g., "x64", "arm64")
}
```

### Requirements
- **Git Commit Provenance:** Every test run must record the active commit hash.
- **Dirty Tree Disclosure:** If `dirty: true`, the test runner must record whether the dirty files were relevant to the test subject or isolated.
- **Timestamping:** All observations must use UTC ISO 8601 timestamps (`YYYY-MM-DDTHH:mm:ssZ`).

---

## 4. Secret Redaction Rules

Under no circumstances may credentials, tokens, or encryption keys be written to repository files, planning artifacts, test logs, or console outputs.

### Redaction Invariants
- Any log, configuration dump, or error trace containing potential secrets must be sanitized before persistence.
- Standard sanitization patterns:
  - `token=[REDACTED]`
  - `password=[REDACTED]`
  - `secret=[REDACTED]`
  - `api_key=[REDACTED]`
  - Bearer tokens: `Authorization: Bearer [REDACTED]`

### Variable Disclosure Policy
When describing environment configuration in artifacts, document metadata only:
1. **Variable Name:** (e.g., `SUPABASE_SERVICE_ROLE_KEY`)
2. **Scope:** Server-only vs. Client-exposed
3. **Sensitivity Class:** Public vs. Restricted vs. Secret
4. **Storage Location:** SecureStore vs. Vercel Secrets vs. `.env.local`

#### Known Configuration Matrix
| Variable | Scope | Sensitivity | Purpose | Handling Invariant |
|---|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | Client | Public | Vercel API Gateway endpoint | Safe to display in full URL format. |
| `EXPO_PUBLIC_SUPABASE_URL` | Client | Public | Supabase project API URL | Safe to display in full URL format. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client | Restricted | Supabase anonymous public key | Masked in logs; safe in client bundle. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Secret | Supabase admin bypass key | **Strictly prohibited in logs and client code.** |
| `GEMINI_API_KEY` | Server | Secret | Google Gemini LLM API key | **Strictly prohibited in logs and client code.** |

---

## 5. Evidence ID and Naming Conventions

To ensure deterministic traceability across the project lifecycle, evidence artifacts follow a unified naming convention.

### Evidence Identifier Pattern
`{phase}-{plan}-{scope}-{slug}`

**Examples:**
- `01-01-local-test-baseline-utils`
- `01-02-local-static-findings-traceability`
- `01-03-web-runtime-coop-coep-headers`
- `02-01-local-test-sqlite-migrations`

### File Organization
- **Artifact Directory:** `.planning/phases/{phase}/artifacts/`
- **Machine-Readable Records:** `{phase}-EVIDENCE-RECORDS.json` (Array of `EvidenceRecord` objects validated by `validate-evidence.mjs`)
- **Human-Readable Reports:** `{phase}-{NAME}-BASELINE.md` or `{phase}-{NAME}.md`
- **Hash Manifests:** `{phase}-ARTIFACT-MANIFEST.json`

---

## 6. Verification Command Format

When automated verification commands are recorded in planning files and execution summaries, they must follow a reproducible format:

```json
{
  "id": "01-01-local-test-baseline-utils",
  "command": "npm run test:baseline",
  "cwd": ".",
  "scope": "local-test",
  "status": "Passed",
  "exitCode": 0,
  "observedAt": "2026-09-15T12:30:00Z",
  "build": {
    "commit": "c7b2a9e",
    "dirty": false
  },
  "notes": [
    "All baseline test suites (verify-baseline, validate-evidence, validate-traceability, validate-prototype-mapping) passed."
  ]
}
```

### Logging Rules
- **Stdout / Stderr:** Record concise summaries of output; avoid persisting gigabytes of build traces.
- **Exit Codes:** Must be captured explicitly. Any non-zero exit code invalidates a `Passed` status.
