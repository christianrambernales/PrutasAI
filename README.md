# PrutasAI

**Offline-first fruit variety and disease identification for Android.**

> Bachelor of Science in Computer Science — Intelligent Systems Track

## Overview

PrutasAI is an Expo (React Native, TypeScript) Android app that identifies a fruit, its Philippine
variety, and disease, entirely on-device. This branch (`final`) contains the **Thesis 2 foundation
layer**: the knowledge pipeline, local database, and model-loading infrastructure the product
screens are built on in later phases.

## Supported Scope

| Fruit  | ML variety classes                          |
|--------|----------------------------------------------|
| Banana | 4 — Lakatan, Latundan, Saba, Cavendish        |
| Mango  | 3 — Carabao, Pico, Katchamita                 |
| Papaya | 4 — Solo, Cavite Special, Red Lady, Sinta     |

11 ML variety classes total across 3 fruits. The fruit list, variety names, and disease/remedy
content are never hardcoded — everything is compiled from `knowledge/taxonomy.yaml`, the single
source of truth.

## Current State

The foundation, screen layer, and SQLite persistence layer are complete; ML inference weights are staged for training.

**Built:**
- Knowledge compiler (`npm run compile:knowledge`) — turns `knowledge/taxonomy.yaml` into seed
  SQL, a class index, and generated TypeScript types
- Live SQLite runtime, migrations, and seeding, plus content, scan, and settings repositories
  (`app/src/core/db`) over active SQLite tables
- App state persistence — user preferences (`language`, `savedLocation`, `useLocation`, `aiAssistant`)
  are stored in the SQLite `setting` table and survive app restarts
- Dynamic content hydration — browsing, varieties, and offline knowledge queries run over live
  database repositories
- A model registry that resolves which pipeline stage can run and steps down a degradation ladder
  when a stage's model is missing or under-confident
- Scale-invariant severity scoring (`app/src/core/severity`) — lesion area over the stage-1 fruit
  box, reporting `undetermined` rather than measuring against the frame
- All ten screens as presentational React Native components in `app/src/features`, over a token
  component library in `app/src/ui` built from `theme.ts`. Icons, controls and navigation are
  built on core primitives — no icon, SVG or navigation package
- A working camera (`expo-camera`) with permission handling, flip, and gallery import
- An offline assistant: a deterministic intent matcher and template renderer over the knowledge
  base (`app/src/core/chat`), with an optional Gemini provider (`gemini-3.6-flash` default) that
  may only reword an answer the app already computed. Two guards reject any rewording that changes
  the verdict or introduces a number the facts did not supply
- A live climate layer (`app/src/core/climate`) on Open-Meteo — no API key, no account: current
  conditions, five-year monthly rainfall normals computed from the archive, and site elevation
- A suitability engine that judges a fruit against those **normals**, never against today's
  weather, and reports `insufficient_data` rather than guessing when a crop requirement or a
  normal is missing
- Full English/Filipino UI (`app/src/ui/i18n`) — the language setting changes every screen
- Model Status reads the real registry, so it reports "Detection model not installed" today

**Not built yet:**
- No trained model weights. `models/` is empty by design. A photo you take is shown back to you
  with "Detection model not installed" — the app never guesses a variety or a disease
- Crop requirements in `app/src/core/climate/suitability.ts` are indicative and flagged
  **unverified** on every surface until the project agriculturist signs them off
- The APK build is configured (see `docs/BUILDING.md`) but has deliberately not been run yet

## Architecture

```
knowledge/*.yaml  --[compiler]-->  seed.sql, classes.json, generated TS types
                                          |
                                          v
app/src/core/      db (SQLite) · ml (model registry) · status
app/src/features/  screen-level feature modules
app/src/ui/        shared theme, i18n

models/  +  scripts/sync-models.mjs  -->  bundled into the Expo app at build/start time
```

## Running It

Requires Node 20 or newer (developed on Node 24). Install once, from the repository root:

```bash
npm install
npm --prefix app install
```

Then start the app. `npm start` runs the knowledge compiler and the model sync first, so the
generated seed SQL, class index and bundled-model map are always current:

```bash
npm start
```

Metro serves on `http://localhost:8081` and prints a QR code.

**On a physical phone, Android or iPhone** — install **Expo Go** from the Play Store or App Store,
put the phone on the same Wi-Fi as this machine, and scan the QR code.

This works because the project is pinned to **Expo SDK 54**, which is the version the store builds
of Expo Go ship (Expo publishes the current store SDK as `expoGoSdkVersion` in its
[versions API](https://api.expo.dev/v2/versions/latest)). Expo Go supports exactly one SDK, so
moving the project to a newer SDK breaks both stores at once and forces sideloading on Android and
a paid Apple Developer account on iOS. Check `expoGoSdkVersion` before bumping the SDK.

**On an Android emulator** — start the emulator from Android Studio first, then press `a` in the
Metro terminal, or run `npm --prefix app run android`.

**In a desktop browser** — use this, and only this:

```bash
npm --prefix app run web
```

Browser preview is for reviewing layout and copy quickly. Android is the target platform, so treat
a phone or emulator as the source of truth.

> **Do not press `w` in a plain `expo start`.** That opens Metro's own port, and the app renders a
> blank white page there. In a browser expo-sqlite runs SQLite in a Web Worker, and this app's
> synchronous database calls block on a `SharedArrayBuffer`, which exists only on a
> **cross-origin isolated** page — one served with `Cross-Origin-Opener-Policy: same-origin` and
> `Cross-Origin-Embedder-Policy: require-corp`. `vercel.json` sets those for the deployed site;
> Expo's dev server cannot (it serves the HTML from a middleware that runs before any
> `metro.config.js` hook). So `run web` starts `scripts/start-web.mjs`, which runs Expo on a
> private port and proxies it with those two headers. It prints the URL to open.

> Opening `http://localhost:8081/` directly in a browser returns a JSON manifest rather than the
> app — that endpoint exists for Expo Go.

> The app still runs in Expo Go, including the camera. Expo Go ships **Expo's own** native
> modules, so `expo-camera`, `expo-image-picker`, `expo-location` and `expo-sqlite` are all
> available inside it — the versions it carries are pinned per SDK in
> `app/node_modules/expo/bundledNativeModules.json`. What Expo Go can never contain is a
> *third-party* native module, so adding `react-native-fast-tflite` for the inference runtime is
> what will finally force a development build or prebuild (design spec §15). `react-dom` and
> `react-native-web` are present for browser preview only and add no native code.
>
> Browser preview has no camera: `expo-camera` needs a device, so use a phone or emulator to test
> capture.

What you will see: all ten screens, navigable. The camera works and the assistant answers
offline. Browsing, varieties, and scan history run against the local SQLite database. Model Status
reads the real registry, so it correctly reports "Detection model not installed" while `models/` is empty.

### Checks

```bash
npm test        # 13 script tests + 305 app tests + 58 api tests
npm run typecheck
```

The app suite includes `app/src/features/__tests__/interactions.test.tsx`, which presses controls
and asserts the app changed. Rendering-only tests cannot catch a button wired to `() => {}`.

For an installable APK, see `docs/BUILDING.md`, or from the root:

```bash
npm run build:apk               # needs the Android SDK and a JDK
```

## Further Reading

- Design spec — `docs/superpowers/specs/2026-08-10-prutasai-thesis2-design.md`
- Build guide — `docs/BUILDING.md`
- Model weights workflow — `models/README.md`

The Thesis 1 prototype — five fruits and a different backend and ML stack — is preserved
unmodified on the `prototype` branch.

## Authors

- Justin Gie E. Santander
- Christian Ram O. Bernales
- Prince Peter T. Osorio

**Thesis Adviser**: Ms. Josephine Eduardo
