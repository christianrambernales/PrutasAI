---
mapped_at: 2026-09-15
---

# Testing

## Test runners

- Root script tests use Node's built-in test runner through `npm run test:scripts`.
- The client uses Jest 29 with `jest-expo` and React Native Testing Library (`npm run test:app`).
- The API uses Vitest (`npm run test:api`).
- Type safety is checked with `npm run typecheck`, which delegates to both `app` and `api`.

## Test placement

- Client tests are generally colocated in `app/src/**/__tests__/` beside the domain under test.
- API tests are centralized in `api/__tests__/` and mirror handlers/utilities such as scans, conversations, assistant, validation, limits, and rate storage.
- Script tests are beside their implementation in `scripts/`.

## Coverage areas observed

- Navigation reducers, onboarding gates, screen rendering, UI primitives, language selection, and trash behavior.
- Database migrations, seed content, repositories, SQLite worker patching, consent, and sync queues.
- Auth restore, account sync, cloud upload ordering, sign-out on unauthorized responses, and UUID behavior.
- Chat intent routing, grounded responses, proxy behavior, output guards, and secret/config checks.
- Climate status/views, coarse location handling, capture routes, model capability status, and severity-related contracts.
- API payload validation, ownership claims, conversation/scan routes, Gemini fallback behavior, rate limits, and handler responses.

## Test technique

- External fetches, Supabase clients, Expo modules, and navigation dependencies are mocked or injected.
- Tests emphasize no-data, offline, unavailable-model, unauthorized, malformed-response, and failure paths.
- Live geocoding tests exist under `app/src/core/geo/__tests__/geocoding.live.test.ts` and may require external access/configuration.

## Verification commands

- Full suite: `npm test`
- Client only: `npm run test:app`
- API only: `npm run test:api`
- Static checks: `npm run typecheck`
