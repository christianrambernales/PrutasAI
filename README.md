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

The foundation and the screen layer are complete; the data and inference layers behind them are not.

**Built:**
- Knowledge compiler (`npm run compile:knowledge`) — turns `knowledge/taxonomy.yaml` into seed
  SQL, a class index, and generated TypeScript types
- SQLite schema, migrations, and seeding, plus content repositories over the seeded tables
- A model registry that resolves which pipeline stage can run and steps down a degradation ladder
  when a stage's model is missing or under-confident
- Scale-invariant severity scoring (`app/src/core/severity`) — lesion area over the stage-1 fruit
  box, reporting `undetermined` rather than measuring against the frame
- All ten screens as presentational React Native components in `app/src/features`, over a token
  component library in `app/src/ui` built from `theme.ts`. No UI dependencies are used: icons,
  controls and navigation are built on core primitives
- Model Status reads the real registry, so it reports "Detection model not installed" today

**Not built yet:**
- No trained model weights. `models/` is empty by design, and the app correctly reports
  "Detection model not installed" until training finishes
- No runtime data layer. `expo-sqlite`, `expo-camera` and `expo-location` are not installed, so
  screens render from typed props supplied by `app/src/preview/previewContent.ts` — clearly
  marked design-preview content that is never a prediction path. Wiring the repositories replaces
  that module without changing a screen
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

**In a desktop browser** — press `w` in the Metro terminal, or:

```bash
npm --prefix app run web
```

Browser preview is for reviewing layout and copy quickly. Android is the target platform, so treat
a phone or emulator as the source of truth.

> Opening `http://localhost:8081/` directly in a browser returns a JSON manifest rather than the
> app — that endpoint exists for Expo Go. Use `w` / `run web` instead, which serves on its own port.

> The app runs in Expo Go *today* because it currently has no native modules — the screen layer is
> built on core React Native primitives with no icon, SVG or navigation packages. `react-dom` and
> `react-native-web` are present for browser preview only and add no native code. Once
> `expo-camera`, `expo-sqlite`, `expo-location` and `react-native-fast-tflite` are added, Expo Go
> stops being an option at **any** SDK — it only ever contains Expo's own native modules, never a
> third-party one like the TFLite runtime — and a development build or prebuild is required
> (design spec §15).

What you will see: all ten screens, navigable. Detection, camera, climate fetching and the
database are not wired yet, so the screens render from `app/src/preview/previewContent.ts`. The
Model Status screen is the exception — it reads the real registry, so it correctly reports
"Detection model not installed" while `models/` is empty.

### Checks

```bash
npm test        # 13 script tests + 68 app tests
npm run typecheck
```

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
