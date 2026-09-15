---
mapped_at: 2026-09-15
---

# Stack

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
