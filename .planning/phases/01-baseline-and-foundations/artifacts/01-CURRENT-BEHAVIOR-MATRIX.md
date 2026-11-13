# Phase 1: Current Behavior Matrix

**Document ID:** `01-CURRENT-BEHAVIOR-MATRIX`  
**Created:** 2026-09-15  
**Phase:** Phase 1: Baseline and Foundations  
**Status:** Active Baseline Contract  
**Analog Source:** `app/src/navigation/navState.ts:7-35`, `app/src/navigation/render/onboarding.tsx`, `app/src/navigation/render/routes.tsx`, `app/src/navigation/render/tabs.tsx`

---

## 1. Purpose & Scope Boundary

This document establishes the verified inventory of all active screens, routes, and UI states within the PrutasAI Expo client (`app/`). It defines the exact technical boundary between:
1. **Active Expo runtime modules**: Real React Native components, hooks, SQLite repositories, and pure reducers.
2. **Automated & verified evidence**: Passing Jest suites and static TypeScript checks in the current checkout.
3. **Truth / Provenance categories**: Strictly distinguishing real user capture, SQLite persistence, bundled sample preview, truthful model degradation, and environment-dependent capabilities.
4. **Platform verification scopes**: Local tests, web runtime, physical Android device, authenticated cloud QA, and deployed Vercel QA.

> [!IMPORTANT]
> **Non-Proof Policy**: The HTML/CSS/JavaScript redesign prototype (`UX-SPEC.md`, `index.html`, `app.js`) serves exclusively as design intent. It contains simulated timers, mock state, and DOM manipulations (`innerHTML`) that do **not** constitute runtime evidence. No row in this matrix may claim `Passed` based on prototype behavior.

---

## 2. Active Route Union & State Contracts

The executable inventory is governed by the pure state reducers in `app/src/navigation/navState.ts` and the startup gate in `app/src/navigation/render/onboarding.tsx`.

### 2.1 Navigation State Definition

```typescript
// Sourced from app/src/navigation/navState.ts
export type TabKey = 'home' | 'climate' | 'chat' | 'history';

export type Route =
  | { name: 'capture' }
  | { name: 'captureResult'; photoUri: string }
  | { name: 'result'; scanId: string }
  | { name: 'varietyInfo'; fruitKey: string }
  | { name: 'monitoring'; sessionId: string }
  | { name: 'settings' }
  | { name: 'modelStatus' }
  | { name: 'locationPicker' }
  | { name: 'account' }
  | { name: 'signup' }
  | { name: 'trash' };

export interface NavState {
  tab: TabKey;
  stack: Route[];
}
```

### 2.2 Onboarding Gate Contract

Before `NavState` renders, `OnboardingGate` evaluates first-run persistence in SQLite:

```typescript
// Sourced from app/src/navigation/render/onboarding.tsx
export function needsOnboarding(p: Pick<OnboardingGateProps,
  'languagePicked' | 'syncMode' | 'consented' | 'accountRequested'>): boolean {
  return !p.languagePicked || p.syncMode === null
    || ((p.syncMode === 'account' || p.accountRequested) && !p.consented);
}
```

---

## 3. Evidence Vocabulary & Provenance Categories

### 3.1 Evidence Status Vocabulary

- `Passed`: Verified by passing automated tests or direct environment logs on active Expo code.
- `Failed`: Explicit test assertion failure, crash, or broken contract.
- `Blocked`: Execution cannot proceed due to missing physical hardware, live credentials, or offline environment.
- `Not tested`: Real implementation exists in Expo, but no automated test or manual verification has been recorded yet.

### 3.2 Verification Scopes

- `local-static`: Static TypeScript typechecking (`npm run typecheck`) and AST validation.
- `local-test`: Headless Jest test suites (`npm --prefix app test`) run in Node/jsdom with mocked natives.
- `web-runtime`: React Native Web browser execution (`npm run start:web`) requiring COOP/COEP isolation.
- `android-device`: Native Android execution on physical device or emulator via APK build (`app/eas.json`).
- `authenticated-qa`: Requires active Supabase credentials and live authenticated session.
- `deployed-qa`: Vercel serverless preview deployment with edge routing.

### 3.3 Truth & Provenance Categories

- `fresh-capture`: User acquires photo in-session via camera or gallery; image URI exists locally on device; evaluated against current runtime pipeline depth.
- `sqlite-persistent`: Data read from or written to local SQLite database (`scans`, `fruits`, `conversations`, `climate_cache`, `settings`).
- `sample-preview`: Bundled static mock content from `app/src/preview/previewContent.ts`. Used solely for design demonstration and isolated tests; **never** claims real prediction.
- `truthful-degradation`: Pipeline truthfully discloses missing ML weights or absent capabilities instead of fabricating predictions.
- `environment-dependent`: Functionality contingent on external APIs, network connectivity, or OS hardware permissions (Open-Meteo, Gemini AI proxy, Supabase Auth, Camera, Location).

---

## 4. Active Behavior Matrix

| State ID | Route / Gate | Renderer / Screen Module | Core / Backing Source | Truth Category | Automated Evidence | Web Runtime | Android Device | Evidence Status | Primary Scope | Gap / Roadmap Target |
|---|---|---|---|---|---|---|---|---|---|---|
| **ONB-01** | Pre-Nav Gate | `LanguagePickScreen.tsx` via `OnboardingGate` | `appState.ts`, SQLite `settings` (`languagePicked`) | `sqlite-persistent` | `app/src/features/__tests__/languagePick.test.tsx`, `onboarding.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 7 (a11y/localization verification) |
| **ONB-02** | Pre-Nav Gate | `WelcomeScreen.tsx` via `OnboardingGate` | `core/auth/syncMode.ts`, SQLite `settings` (`syncMode`) | `sqlite-persistent` | `app/src/features/__tests__/interactions.test.tsx`, `onboarding.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 4 (transition/copy refinement) |
| **ONB-03** | Pre-Nav Gate | `ConsentScreen.tsx` via `OnboardingGate` | `core/auth/consent.ts`, SQLite `settings` (`consented`) | `sqlite-persistent` | `app/src/features/__tests__/consent.test.tsx`, `onboarding.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 4 (flow) / Phase 7 (a11y) |
| **TAB-01** | Tab `home` | `HomeScreen.tsx` via `TabBody` | `core/status`, `repositories/scans.ts`, `fruits.ts`, `useClimate.ts` | `sqlite-persistent` + `truthful-degradation` | `app/src/features/__tests__/screens.test.tsx`, `interactions.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 4 (hierarchy & field-tag integration) |
| **TAB-02** | Tab `climate` | `ClimateScreen.tsx` via `TabBody`, `TabBar` | `useClimate.ts`, `core/climate/openMeteo.ts`, `repositories/climate.ts` | `environment-dependent` (Open-Meteo) | `app/src/features/__tests__/climateFlow.test.tsx`, `screens.test.tsx` | Supported (CORS) | Supported | `Passed` (mocked) | `local-test` | Phase 2 (offline caching), Phase 5 (agronomic rules) |
| **TAB-03** | Tab `chat` | `ChatScreen.tsx` via `TabBody`, `TabBar` | `useChatRuntime.ts`, `core/chat/`, `preview.CHAT_SUGGESTIONS` | `sqlite-persistent` + `environment-dependent` | `app/src/features/__tests__/assistantTiers.test.tsx`, `chatUpload.test.tsx`, `screens.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 3 (cloud sync), Phase 5 (grounded prompts) |
| **TAB-04** | Tab `history` | `HistoryScreen.tsx` via `TabBody`, `TabBar` | `useHistoryFilters.ts`, `repositories/scans.ts` | `sqlite-persistent` | `app/src/features/__tests__/screens.test.tsx`, `interactions.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 2 (schema/duplicate ID), Phase 4 (filter UX) |
| **RTE-01** | `{ name: 'capture' }` | `CameraCapture.tsx` via `AppNavigator` | `useCaptureRoute.ts`, `expo-camera`, `expo-image-picker` | `environment-dependent` (Hardware Camera) | `app/src/features/__tests__/interactions.test.tsx`, `navigation/__tests__/render.test.tsx` | Fallback Picker | Native Camera | `Passed` (mocked) | `local-test` | Phase 4 (crop/surface pre-filter & review screen) |
| **RTE-02** | `{ name: 'captureResult' }` | `CaptureResultScreen.tsx` via `RouteBody` | `useCaptureRoute.ts`, `core/status`, `describeDetectionCapability` | `fresh-capture` + `truthful-degradation` | `app/src/features/__tests__/screens.test.tsx`, `interactions.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 4 (journey), Phase 6 (connect ML pipeline) |
| **RTE-03** | `{ name: 'result' }` | `CaptureResultScreen.tsx` via `RouteBody` | `findScan()` in `repositories/scans.ts` | `sqlite-persistent` + `truthful-degradation` | `app/src/features/__tests__/screens.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 2 (persist inference fields), Phase 4 (remedy flow) |
| **RTE-04** | Isolated Component | `ResultScreen.tsx` (Unrouted at runtime) | `preview/previewContent.ts` (`ScanResult`) | `sample-preview` ONLY | `app/src/features/__tests__/screens.test.tsx` | Supported | Supported | `Passed` (test-only) | `local-test` | Phase 5 (remedy gate), Phase 6 (ML inference UI) |
| **RTE-05** | `{ name: 'varietyInfo' }` | `VarietyInfoScreen.tsx` via `RouteBody` | `repositories/fruits.ts`, compiled knowledge YAML | `sqlite-persistent` + unverified thresholds | `app/src/features/__tests__/screens.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 5 (agronomic validation of thresholds) |
| **RTE-06** | `{ name: 'monitoring' }` | `MonitoringScreen.tsx` via `RouteBody` | `preview/previewContent.ts` (`sessionForScan`) | `sample-preview` ONLY | `app/src/features/__tests__/screens.test.tsx` | Supported | Supported | `Passed` (preview-only) | `local-test` | Phase 2 (checkpoint persistence table), Phase 4 (monitoring) |
| **RTE-07** | `{ name: 'settings' }` | `SettingsScreen.tsx` via `RouteBody` | SQLite `settings`, `CONTENT_VERSION`, Open-Meteo normals status | `sqlite-persistent` + `environment-dependent` | `app/src/features/__tests__/screens.test.tsx`, `interactions.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 3 (account sync options), Phase 7 (copy audit) |
| **RTE-08** | `{ name: 'modelStatus' }` | `ModelStatusScreen.tsx` via `RouteBody`, `RouteBar` | `core/ml/registry.ts`, `manifest.json`, `bundledModels.ts` | `truthful-degradation` (0 models installed) | `app/src/features/__tests__/screens.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 6 (model import pipeline verification) |
| **RTE-09** | `{ name: 'locationPicker' }` | `LocationPickerScreen.tsx` via `RouteBody` | `core/geo/`, `expo-location`, SQLite `settings` | `environment-dependent` (GPS/Reverse Geocoding) | `app/src/features/__tests__/screens.test.tsx`, `interactions.test.tsx` | Fallback list | GPS + list | `Passed` (mocked) | `local-test` | Phase 2 (offline location data), Phase 4 (picker UX) |
| **RTE-10** | `{ name: 'account' }` | `AccountScreen.tsx` via `RouteBody` | `useAccountSync.ts`, `core/auth/supabaseAuth.ts` | `environment-dependent` (Supabase Cloud Auth) | `app/src/features/__tests__/accountSync.test.tsx`, `screens.test.tsx` | Supported | Supported | `Passed` (mocked) | `local-test` | Phase 3 (live session recovery & sync conflict gates) |
| **RTE-11** | `{ name: 'signup' }` | `SignUpScreen.tsx` via `RouteBody` | `useAccountSync.ts`, `core/auth/supabaseAuth.ts` | `environment-dependent` (Supabase Cloud Auth) | `app/src/features/__tests__/accountSync.test.tsx` | Supported | Supported | `Passed` (mocked) | `local-test` | Phase 3 (credential validation & offline handling) |
| **RTE-12** | `{ name: 'trash' }` | `TrashScreen.tsx` via `RouteBody` | `repositories/conversations.ts`, `purgeTrash.ts` | `sqlite-persistent` + remote purge | `app/src/features/__tests__/screens.test.tsx` | Supported | Supported | `Passed` | `local-test` | Phase 3 (remote sync purge), Phase 4 (multi-select) |

---

## 5. Detailed Behavioral Scope Analysis

### 5.1 Fresh Capture vs. Stored Scan

The active codebase enforces a strict separation between a photo just acquired and a previously recorded scan:
1. **Fresh Capture (`captureResult`)**:
   - Accepts a local temporary image URI (`photoUri`).
   - Evaluates active pipeline depth via `core/status` (`pipelineDepth(statuses)`).
   - Because no model weights are installed (`manifest.json` is empty), `CaptureResultScreen` displays:
     - The captured photo preview.
     - Headline: *"Fruit, variety and disease"* (or unconfigured capability).
     - Status: *"No detection models installed"*.
     - Call to action: Directs the user to `ModelStatusScreen` (`npm run sync:models`) or allows scanning again.
   - **No prediction, disease name, or severity score is fabricated.**
2. **Stored Scan Reopen (`result`)**:
   - Looks up the record in SQLite via `findScan(db, scanId)`.
   - If found, passes `record: { title, detail, timeLabel }` to `CaptureResultScreen`.
   - If the photo was captured on a different synced device and omitted due to privacy policies, it renders an explicit missing placeholder: *"Photo stored on original device only"*.
   - If the scan ID cannot be located in SQLite, renders an honest error state: *"Scan not found. This scan is no longer stored on this device."*
   - Crucially, stored scan reopening does **not** fall back to design-preview mockups.

### 5.2 Sample/Preview Content vs. Real SQLite Persistence

The application contains two distinct presentation layers:
1. **Real SQLite Persistence**:
   - Backed by `expo-sqlite` and `app/src/core/db/`.
   - Populated at startup by migrations (`001_initial.sql`, `002_scans_uuid.sql`) and `seed.sql`.
   - Powers `HomeScreen` (recent scans), `HistoryScreen` (grouped scan history with search/filters), `VarietyInfoScreen` (compiled botanical knowledge), and `TrashScreen` (soft-deleted conversations).
2. **Bundled Sample/Preview (`previewContent.ts`)**:
   - Contains static mock objects: `RECENT_SCANS`, `SCAN_GROUPS`, `FRUITS`, `CLIMATE`, `SESSION`, and `CHAT_SUGGESTIONS`.
   - `ResultScreen.tsx`: An elaborate presentational screen demonstrating bounding boxes, Eigen-CAM heatmaps, severity meters (e.g. "lesion 34%"), and cultural remedies. It explicitly renders a warning banner when `sample=true`: *"Sample scan. The scan database is not wired yet, so this is bundled design content — not something a model produced."*
   - **Current Route State**: `ResultScreen.tsx` is currently **unrouted** in production `routes.tsx` to prevent exposing ungrounded mock detections. It exists as an isolated component tested in `screens.test.tsx`.
   - `MonitoringScreen.tsx`: Currently falls back to `preview.SESSION` when a session is opened. This is a recognized gap; real monitoring requires durable SQLite checkpoint schema (Phase 2).

### 5.3 No-Model Truthful Degradation

In accordance with project constraints, model weights are not committed to the repository. The active client implements truthful capability reporting:
- `describeDetectionCapability(statuses)` in `app/src/core/status/describeDetectionCapability.ts` dynamically evaluates the model manifest and bundled map.
- When 0 models are installed, the app reports depth 0.
- `HomeScreen` displays a dedicated badge showing installed model count (e.g., "0 of 6 models installed").
- `ModelStatusScreen` provides full disclosure of all 6 planned stages (Crop identification, Variety classifier, Disease detector, etc.) with explicit status tags (`Missing`, `Uninstalled`).
- The assistant gracefully falls back to deterministic local knowledge matching when AI proxy models are unavailable.

### 5.4 Environment-Dependent Claims & Fallbacks

Several features interact with external networks or hardware sensors:
1. **Climate Integration**:
   - Uses Open-Meteo API (no API key required).
   - If online and location is set, fetches current temperature, precipitation, and 5-year normals.
   - If offline or request fails, falls back to SQLite-cached normals without blocking app startup.
   - If no location is selected, prompts user to select a location first.
2. **Online AI Assistant (Gemini Proxy)**:
   - Controlled by `app.aiAssistant` toggle and `EXPO_PUBLIC_API_URL` availability.
   - When offline or disabled, chat is restricted to deterministic regex-intent matching against local compiled YAML knowledge (`banana`, `mango`, `papaya` diseases and remedies).
   - Prompts clearly distinguish between *"Grounded offline assistant"* and *"Online assistant ready"*.
3. **Hardware Sensors (Camera & Geolocation)**:
   - Camera: Prompts for `CAMERA` permission; falls back gracefully to `expo-image-picker` gallery selection if permission is denied or camera is unavailable (e.g., in web runtime).
   - Location: Uses coarse/rounded coordinates to safeguard farmer location privacy; provides manual municipality picker if GPS permission is denied.

---

## 6. Platform Evidence Matrix & Verification Gaps

| Scope | Automated Test Suite | Runtime / Build Command | Current Status | Notes & Known Gaps |
|---|---|---|---|---|
| `local-static` | `npm run typecheck` | TypeScript 5.9 compiler | `Passed` | Verifies full client and API contracts with zero errors. |
| `local-test` | `npm --prefix app test` | Jest 29 + `jest-expo` | `Passed` | 12 test suites, 78 tests passing across navigation, auth, screens, and interactions. |
| `web-runtime` | Manual web review | `npm run start:web` | `Passed` | Requires COOP/COEP HTTP headers for web SQLite wasm (`start-web.mjs`). Camera falls back to image upload. |
| `android-device` | Release APK build | `npm run build:apk` | `Not tested` in Phase 1 | Build script configured; verification pending physical Android test run in Phase 7. |
| `authenticated-qa` | Cloud sync tests | Mocked in Jest; live unverified | `Blocked` | No live Supabase service-role secrets committed to repository; live sync pending QA environment. |
| `deployed-qa` | Vercel QA staging | Staging deployment URL | `Not tested` in Phase 1 | Deployment configuration ready; production release deliberately out of scope. |

---

## 7. Downstream Phase Routing

All identified behavior gaps from this matrix are mapped directly to implementation roadmap phases:
- **Phase 2 (Persistence & Local Foundations)**:
  - SQLite schema expansion for scan inference results (eliminating gap between capture and diagnosis storage).
  - Durable checkpoint and monitoring session tables (retiring `preview.SESSION` fallback).
  - Coarse location storage and offline climate normal caching.
- **Phase 3 (Cloud Synchronization & Authentication)**:
  - Resilient Supabase auth flows, token refresh, and network retry handling.
  - Remote purge synchronization for soft-deleted conversations in `TrashScreen`.
- **Phase 4 (End-to-End User Flows & Mobile Navigation)**:
  - Adding explicit crop/surface confirmation and photo-review steps to the capture flow.
  - Integrating the field-tag inspection strip into `HomeScreen` and `ResultScreen`.
  - Refined filter and search interactions in `HistoryScreen`.
- **Phase 5 (Agronomic Grounding & Safe AI Workflows)**:
  - Expert validation of variety climate thresholds in `VarietyInfoScreen`.
  - Safety gates, chemical label caveats, and agricultural extension escalation for remedies.
  - Deterministic assistant prompt validation.
- **Phase 6 (On-Device ML Pipeline Readiness)**:
  - Connecting `CaptureResultScreen` to real TensorFlow Lite runtime once approved models are imported.
  - Wiring multi-stage detection outputs (fruit -> variety -> condition -> severity).
- **Phase 7 (Accessibility, Quality, and Verification)**:
  - Physical Android device validation and 375dp small-screen reflow tests.
  - Full WCAG 2.1 AA accessibility audit (Dynamic Type, 44x44 touch targets, screen reader announcements).
