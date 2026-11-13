<!-- GSD:project-start source:PROJECT.md -->
## Project

**PrutasAI**

PrutasAI is an offline-first agricultural decision-support application for Filipino farmers, agricultural extension workers, researchers, and fruit cultivators. It combines local crop and disease knowledge, climate suitability guidance, capture/history/monitoring flows, a grounded bilingual assistant, optional cloud synchronization, and a future on-device ML diagnostic pipeline in one Android and web-capable product.

This project phase finishes and furnishes every non-ML part of the product for thesis/demo use and deployment readiness. The existing Vercel deployment remains a QA environment; this phase prepares but does not publish a live production release. Approved ML models remain a future file-import step.

**Core Value:** Users can make a trustworthy, useful agricultural decision offline, with every unavailable capability clearly disclosed instead of guessed or fabricated.

### Constraints

- **ML dependency**: No model weights are available in this phase; all flows must remain complete, honest, and demonstrable without them.
- **Deployment**: Prepare and validate the existing Vercel QA deployment and build configuration, but do not deploy to live production.
- **Privacy**: Photos remain on-device, location is coarse/rounded, and service-role/provider secrets remain server-side.
- **Offline-first**: Core guidance, history, deterministic assistant behavior, and local persistence must not require a network connection.
- **Compatibility**: Preserve Android and web support, including cross-origin isolation requirements for web SQLite and Expo platform behavior.
- **Architecture**: Preserve the client/core/features/UI, API route/handler, knowledge compiler, model synchronization, and Supabase migration boundaries unless a documented decision changes them.
- **Safety**: Disease, severity, remedy, and assistant output must remain grounded, uncertainty-aware, and clearly decision-support rather than professional diagnosis.
- **Verification**: Missing live, authenticated, device, or deployment evidence is a gap to verify, not a pass inferred from local tests.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Repository shape
- JavaScript/TypeScript monorepo with a root build layer, an Expo mobile/web client, and Vercel serverless API functions.
- Root package metadata is in `package.json`; client and API manifests are `app/package.json` and `api/package.json`.
- Knowledge data is authored as YAML under `knowledge/` and compiled by `scripts/compile-knowledge.mjs`.
## Runtime and frameworks
- React Native 0.81 with Expo SDK 54, React 19, and React Native Web.
- TypeScript 5.9 is used by `app/` and `api/`; the root utility scripts are native ES modules.
- Jest with `jest-expo` and `@testing-library/react-native` tests the app.
- Vitest tests the Vercel API; `@vercel/node` supplies serverless typing/runtime support.
- SQLite is provided by `expo-sqlite`; web startup depends on COOP/COEP isolation.
## Important dependencies
- `@supabase/supabase-js` is used by both client auth/sync and the API service-role wrapper.
- `expo-camera`, `expo-image-picker`, `expo-location`, and `expo-secure-store` provide device capabilities.
- `yaml` supports knowledge compilation; `patch-package` applies the Expo SQLite web patch.
## Build and development
- `npm run start` runs Expo; `npm run start:web` runs the web proxy in `app/scripts/start-web.mjs`.
- `npm run typecheck` checks both client and API; `npm test` runs script, app, and API suites.
- `vercel.json` builds knowledge/models, exports `app/dist`, installs all three package roots, and sets cross-origin headers.
- `app/eas.json` defines Android build profiles; `npm run build:apk` performs a clean Expo Android prebuild and release assembly.
## Configuration
- Public client API routing uses `EXPO_PUBLIC_API_URL` (validated by `app/src/core/chat/apiBaseUrl.ts`).
- API secrets are server-only environment variables, including Gemini and Supabase service-role credentials.
- Model weights are staged in `models/` and synchronized into `app/assets/models/`; generated weights are intentionally not source data.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## TypeScript and modules
- ES module syntax and named exports are the dominant style.
- Interfaces and discriminated unions define public contracts for screens, providers, state, and storage drivers.
- Pure functions are preferred for reducers, filters, severity calculations, intent matching, and view builders.
- Dependency injection is used for fetch/database implementations in testable core and API functions.
## React patterns
- Screens expose explicit `Props` interfaces and are composed by navigation renderers.
- Hooks own asynchronous loading and orchestration; screens primarily render derived state and invoke callbacks.
- Shared controls and chrome live in `app/src/ui/components/` and are re-exported from `app/src/ui/index.ts`.
- Text is sourced through `useT()` and the English/Filipino dictionaries rather than hard-coded in screens.
## Errors and status
- Async failures become typed status/error values and user-visible notices.
- Startup failures are rendered by the `Startup` gate in `app/App.tsx`; they are not swallowed.
- Capability/status modules avoid claiming a model or network feature that is unavailable.
- API handlers return consistent HTTP responses through `api/_lib/http.ts` and log upstream failures without exposing credentials.
## Persistence and privacy
- SQLite access is hidden behind `SqlDriver`, migrations, seed logic, and repositories.
- Sync operations are idempotent and retain local state when offline or when a request fails.
- Image paths are kept local; cloud payloads contain metadata only.
- Auth/session handling is isolated in `app/src/core/auth/` and cloud ownership is enforced by server checks plus database policies.
## Formatting and tests
- Existing code uses semicolons, single quotes, trailing commas, and compact focused modules.
- Tests use behavior-oriented names and assert user-visible or contract-level outcomes.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Overall pattern
- The system is a local-first React Native application with an optional cloud synchronization boundary.
- UI components receive explicit props and view-model-shaped data; domain logic lives in `app/src/core/`.
- The API is a thin Vercel Functions layer: route adapters in `api/v1/`, validation/security utilities in `api/_lib/`, and focused handlers in `api/_lib/handlers/`.
## Client layers
- `app/App.tsx` performs startup checks, warms the database, and mounts `AppNavigator` only after readiness.
- `app/src/navigation/` owns tab/stack state and route rendering rather than relying on a third-party navigation framework.
- `app/src/features/` contains screen-level flows: capture, result, history, climate, chat, account, settings, and monitoring.
- `app/src/core/` contains storage, auth, sync, climate, ML contracts, severity, chat, and status logic.
- `app/src/ui/` is the shared visual system, primitives, feedback components, theme tokens, and bilingual dictionary.
## Data flow
- Capture flow stores scan metadata and local image references, invokes the staged model pipeline, computes severity, then renders a result/remedy view.
- Repositories in `app/src/core/db/repositories/` abstract SQLite tables from feature screens.
- `app/src/core/sync/` uploads queued metadata and conversations when connectivity/account conditions allow, then marks local rows synchronized.
- Chat first routes through deterministic intent matching and curated content; general questions may use the proxy provider.
## API flow
- A route in `api/v1/` passes request handling to a handler, which validates payloads with `api/_lib/validate.ts`, authenticates where required, and emits standardized responses from `api/_lib/http.ts`.
- The API service-role client bypasses RLS, so route validation and ownership checks are critical security boundaries.
- Rate limiting is implemented with `api/_lib/limits.ts` and the Supabase-backed `api/_lib/rateStore.ts`.
## Cross-cutting principles
- Truthful degradation: unavailable model stages are reported explicitly.
- Privacy by construction: photos remain on-device and location is coarse.
- Safe output: agronomic knowledge is grounded in compiled local content and guarded AI responses.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
