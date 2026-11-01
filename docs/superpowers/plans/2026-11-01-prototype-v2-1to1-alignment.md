# Prototype v2 Exact 1:1 Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform all 19 screens in the application into exact 1-to-1 visual and layout replicas of `interactive-prototype-v2.html` while preserving offline SQLite persistence, typed screen props, and truthful capability reporting.

**Architecture:** Build a dedicated prototype UI primitive library (`GreenTopCell`, `FrostedCard`, `BtnOrangeFull`, `BtnForestFull`, `BtnOutline`, `BtnSubtle`, `StatusBadge`, `CropCircleAvatar`, `ObservationGrid`, `ClimateHistogram`) in `app/src/ui/`. Wire these components across all 19 screens grouped by feature domain. Provide a demo test pathway in `CaptureResultScreen` routing to the illustrative `ResultScreen` scenario.

**Tech Stack:** React Native 0.81, Expo SDK 54, React 19, TypeScript 5.9, `expo-linear-gradient`, `expo-sqlite`, Jest, React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-01-prototype-v2-1to1-alignment-design.md`

## Global Constraints

- D-01: Adapt all 19 screens present in the prototype.
- D-02: Navigation is Home, Monitoring, central Scan action, Assistant, Account. Scan launches capture and is not a persistent selected tab.
- D-03: History and Climate remain accessible from Home.
- D-04: The diagnosis layout appears only for real results. Show **Analysis unavailable** when no verified model is installed. Verified installation alone must never be treated as successful inference; display only analysis actually produced and validated for the saved photo.
- D-05: Web retains a compact mobile layout centered on larger screens (max width 395px). Android fills available space, respecting safe areas and text scaling.
- D-06: Connect screen interactions to existing real services; preserve English/Filipino support, empty/loading/offline/error states, and combined Account/Settings composition.
- No illustrative diagnosis entry, demo account, synthetic user records, sample weather, inferred recovery, or fabricated percentages ship as real app content.
- Photos remain on-device; coarse location and owner-scoped metadata sync remain intact.
- Target WCAG 2.2 AA on web and Android TalkBack/focus order/touch targets/text scaling.

---

### Task 1: Prototype Visual Primitives Library

**Files:**
- Create: `app/src/ui/components/prototype/GreenTopCell.tsx`
- Create: `app/src/ui/components/prototype/FrostedCard.tsx`
- Create: `app/src/ui/components/prototype/PrototypeButtons.tsx`
- Create: `app/src/ui/components/prototype/StatusBadge.tsx`
- Create: `app/src/ui/components/prototype/CropCircleAvatar.tsx`
- Create: `app/src/ui/components/prototype/index.ts`
- Modify: `app/src/ui/index.ts`
- Test: `app/src/ui/__tests__/prototypeComponents.test.tsx`

**Interfaces:**
- Produces:
  - `GreenTopCell({ title, subtitle, badge, leftAction, rightAction, headerIcon, centered })`
  - `FrostedCard({ children, accentBorder, surfaceColor, onPress, style })`
  - `BtnOrangeFull({ label, icon, onPress, disabled, style })`
  - `BtnForestFull({ label, icon, onPress, disabled, style })`
  - `BtnOutline({ label, icon, onPress, disabled, style })`
  - `BtnSubtle({ label, icon, onPress, disabled, style, textColor })`
  - `StatusBadge({ variant, label })`
  - `CropCircleAvatar({ crop, size, emoji })`

- [ ] **Step 1: Write the failing test for prototype components**

```tsx
// app/src/ui/__tests__/prototypeComponents.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  GreenTopCell,
  FrostedCard,
  BtnOrangeFull,
  BtnForestFull,
  BtnOutline,
  StatusBadge,
  CropCircleAvatar,
} from '../components/prototype';

describe('Prototype Primitives', () => {
  it('renders GreenTopCell with title, subtitle, and badges', () => {
    render(
      <GreenTopCell
        title="Good day!"
        subtitle="Decision-support for your fruit crops"
        badge={{ label: 'Local Offline Mode', variant: 'offline' }}
      />
    );
    expect(screen.getByText('Good day!')).toBeTruthy();
    expect(screen.getByText('Decision-support for your fruit crops')).toBeTruthy();
    expect(screen.getByText('Local Offline Mode')).toBeTruthy();
  });

  it('renders FrostedCard with accent border', () => {
    render(
      <FrostedCard accentBorder="forest">
        <GreenTopCell title="Inner Card" />
      </FrostedCard>
    );
    expect(screen.getByText('Inner Card')).toBeTruthy();
  });

  it('fires onPress on BtnOrangeFull and BtnForestFull', () => {
    const onOrange = jest.fn();
    const onForest = jest.fn();
    render(
      <>
        <BtnOrangeFull label="Take Photo" onPress={onOrange} />
        <BtnForestFull label="Save Note" onPress={onForest} />
      </>
    );
    fireEvent.press(screen.getByText('Take Photo'));
    expect(onOrange).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('Save Note'));
    expect(onForest).toHaveBeenCalledTimes(1);
  });

  it('renders StatusBadge variants correctly', () => {
    render(<StatusBadge variant="healthy" label="96% Match" />);
    expect(screen.getByText('96% Match')).toBeTruthy();
  });

  it('renders CropCircleAvatar with correct emoji', () => {
    render(<CropCircleAvatar crop="mango" size={48} />);
    expect(screen.getByText('🥭')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/ui/__tests__/prototypeComponents.test.tsx`
Expected: FAIL due to missing `components/prototype` module.

- [ ] **Step 3: Implement prototype components**

Implement `GreenTopCell.tsx` using `expo-linear-gradient` (`colors={['#154d2e', '#0b2b19']}`), rounded bottom border, typography, and optional actions.
Implement `FrostedCard.tsx` with `#ffffff` background, `1px solid rgba(21, 77, 46, 0.14)` border, 18px radius, shadow, and 4px left-border accents for `'forest' | 'orange' | 'amber' | 'healthy' | 'info' | 'severe' | 'dashed-orange'`.
Implement `PrototypeButtons.tsx` with `BtnOrangeFull` (gradient `#c2410c` to `#ea580c`), `BtnForestFull` (`#154d2e`), `BtnOutline`, and `BtnSubtle`.
Implement `StatusBadge.tsx` and `CropCircleAvatar.tsx`.
Re-export from `app/src/ui/components/prototype/index.ts` and `app/src/ui/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/ui/__tests__/prototypeComponents.test.tsx`
Expected: PASS

- [ ] **Step 5: Run typecheck and commit**

Run: `npm --prefix app run typecheck`
```bash
git add app/src/ui/components/prototype/ app/src/ui/index.ts app/src/ui/__tests__/prototypeComponents.test.tsx
git commit -m "feat(ui): add prototype v2 visual primitive components"
```

---

### Task 2: Floating Bottom Navigation and Viewport Refinements

**Files:**
- Modify: `app/src/ui/components/chrome.tsx`
- Modify: `app/src/ui/__tests__/chrome.test.tsx`

**Interfaces:**
- Consumes: `BottomNav({ tabs, active, onSelect, onScan })`, `Icon`
- Produces: Floating 64px white pill navigation bar with 36px border radius, 4 tabs (Home, Monitoring, Assistant, Account), and an elevated 52px orange gradient camera FAB.

- [ ] **Step 1: Write test verifying floating nav styling and hit targets**

```tsx
// in app/src/ui/__tests__/chrome.test.tsx
it('renders floating bottom nav with elevated center FAB', () => {
  const onSelect = jest.fn();
  const onScan = jest.fn();
  render(
    <BottomNav
      tabs={[
        { key: 'home', label: 'Home', icon: 'home' },
        { key: 'monitoring', label: 'Monitoring', icon: 'monitoring' },
        { key: 'chat', label: 'Assistant', icon: 'chat' },
        { key: 'account', label: 'Account', icon: 'account' },
      ]}
      active="home"
      onSelect={onSelect}
      onScan={onScan}
    />
  );
  expect(screen.getByTestId('bottom-nav-pill')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: /scan/i }));
  expect(onScan).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify behavior**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/ui/__tests__/chrome.test.tsx`

- [ ] **Step 3: Update `chrome.tsx` styles**

Align `BottomNav` pill: background `#ffffff`, border `1px solid rgba(21, 77, 46, 0.12)`, radius 36px, height 64px, and elevated 52px circular FAB with orange gradient (`#c2410c` to `#ea580c`) and 3px white border. Ensure touch targets meet 48dp minimum.

- [ ] **Step 4: Verify test passes and typecheck**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/ui/__tests__/chrome.test.tsx`
Run: `npm --prefix app run typecheck`

- [ ] **Step 5: Commit**

```bash
git add app/src/ui/components/chrome.tsx app/src/ui/__tests__/chrome.test.tsx
git commit -m "feat(ui): refine floating bottom navigation pill and elevated center FAB"
```

---

### Task 3: Bilingual Dictionary Keys for Prototype Screens

**Files:**
- Modify: `app/src/ui/i18n/en.json`
- Modify: `app/src/ui/i18n/fil.json`
- Modify: `app/src/ui/i18n/strings.ts`
- Test: `app/src/ui/__tests__/i18nCoverage.test.ts`

**Interfaces:**
- Produces: Dictionary string keys used across all 19 prototype screens.

- [ ] **Step 1: Write test verifying parity between EN and FIL keys**

```ts
// app/src/ui/__tests__/i18nCoverage.test.ts
import en from '../i18n/en.json';
import fil from '../i18n/fil.json';

describe('i18n dictionary key parity', () => {
  it('has identical keys in en and fil dictionaries', () => {
    const enKeys = Object.keys(en).sort();
    const filKeys = Object.keys(fil).sort();
    expect(enKeys).toEqual(filKeys);
  });
});
```

- [ ] **Step 2: Add all prototype string tokens to `en.json`, `fil.json`, and `strings.ts`**

Add keys including:
- `prototypeLocalOffline`: "Local Offline Mode" / "Lokal na Offline"
- `prototypeGreeting`: "Good day!" / "Magandang araw!"
- `prototypeTagline`: "Decision-support for your fruit crops" / "Handang tumulong sa iyong pananim"
- `prototypeTakeChoosePhoto`: "Take or Choose Photo" / "Kumuha o Pumili ng Litrato"
- `prototypePhotoStorageBlurb`: "Stored on your device. Works fully without internet." / "Ligtas na naka-imbak sa telepono. Hindi kailangan ng internet."
- `prototypeCameraAction`: "Camera" / "Kumuha (Camera)"
- `prototypeGalleryAction`: "Pick from Gallery" / "Gallery / File"
- `prototypeRecentActivity`: "Recent Activity" / "Kamakailang Tala (Recent Activity)"
- `prototypeViewHistory`: "View History" / "Tingnan Lahat"
- `prototypeCropProfiles`: "Crop Profiles & Guidance" / "Mga Gabay sa Pananim"
- `prototypeEncyclopedia`: "Encyclopedia" / "Encyclopedia"
- `prototypeObservationPrompt`: "How has the fruit/lesion condition progressed?" / "Kumusta ang kalagayan ng prutas/sugat ngayon?"
- `prototypeObservationSub`: "Select based on your direct orchard inspection:" / "Pumili base sa iyong sariling pagmamasid sa taniman:"
- `prototypeObsBetter`: "Better" / "Mas Mabuti"
- `prototypeObsSame`: "About Same" / "Kapareho Lang"
- `prototypeObsWorse`: "Worse" / "Lumala"
- `prototypeObsUnsure`: "Unsure" / "Hindi Sigurado"
- `prototypeSaveObservation`: "Save Observation to SQLite" / "I-save ang Obserbasyon sa SQLite"
- `prototypeDemoTestButton`: "[Demo Test] View Illustrative Sample Screen" / "[Demo Test] Tingnan ang Halimbawang Resulta"
- `prototypeIllustrativeNotice`: "Data below is for thesis demonstration only. This is not an automated or professional diagnosis." / "Ang datos sa ibaba ay demonstrasyon lamang para sa pagsusuri ng UI. Hindi ito opisyal na diagnosis ng eksperto."
- `prototypeNoModelWeightsHeadline`: "Disease Diagnosis: No Model Weights" / "Pagsusuri sa Sakit: Walang Model Weights"
- `prototypeNoModelWeightsBlurb`: "Photo securely stored on device. In this thesis development phase, diagnostic weights are not installed, so no speculative disease percentages are fabricated." / "Ligtas na na-save ang litrato sa SQLite database ng telepono. Walang inilagay na diagnostic weights sa yugtong ito ng thesis, kaya walang gawa-gawang porsyento ng sakit."

- [ ] **Step 3: Run test to verify dictionary parity**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/ui/__tests__/i18nCoverage.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/src/ui/i18n/en.json app/src/ui/i18n/fil.json app/src/ui/i18n/strings.ts app/src/ui/__tests__/i18nCoverage.test.ts
git commit -m "feat(i18n): add prototype v2 string tokens for English and Filipino"
```

---

### Task 4: Screen 1 (Home Dashboard) 1:1 Implementation

**Files:**
- Modify: `app/src/features/home/HomeScreen.tsx`
- Modify: `app/src/features/__tests__/redesignHomeHistory.test.tsx`

**Interfaces:**
- Consumes: `HomeScreenProps`, `GreenTopCell`, `FrostedCard`, `BtnOrangeFull`, `BtnOutline`, `BtnSubtle`, `StatusBadge`, `CropCircleAvatar`
- Produces: Exact 1-to-1 layout of `scripts/prototype_screens/home.html`.

- [ ] **Step 1: Write test for Home Screen 1:1 layout elements**

```tsx
// in app/src/features/__tests__/redesignHomeHistory.test.tsx
it('renders Home Screen matching prototype v2 composition', () => {
  render(
    <HomeScreen
      capabilityHeadline="Offline Mode"
      capabilityDetail="No model"
      readyModelCount={0}
      totalModelCount={3}
      fruits={[
        { key: 'mango', name: 'Mango', emoji: '🥭', diseaseCount: 2 },
        { key: 'banana', name: 'Banana', emoji: '🍌', diseaseCount: 3 },
        { key: 'papaya', name: 'Papaya', emoji: '🍈', diseaseCount: 1 },
      ]}
      climate={null}
      recentScans={[]}
      language="EN"
      onToggleLanguage={jest.fn()}
      onScan={jest.fn()}
      onOpenFruit={jest.fn()}
      onOpenScan={jest.fn()}
      onOpenSettings={jest.fn()}
      onOpenClimate={jest.fn()}
      onViewAllScans={jest.fn()}
      onSetLocation={jest.fn()}
    />
  );
  expect(screen.getByText(/Good day!/i)).toBeTruthy();
  expect(screen.getByText(/Take or Choose Photo/i)).toBeTruthy();
  expect(screen.getByText(/Recent Activity/i)).toBeTruthy();
  expect(screen.getByText(/Crop Profiles & Guidance/i)).toBeTruthy();
  expect(screen.getByText(/Climate Normals/i)).toBeTruthy();
});
```

- [ ] **Step 2: Update `HomeScreen.tsx` to match `home.html`**

Structure `HomeScreen.tsx` with:
- `GreenTopCell` with `Local Offline Mode` badge, `Good day!`, and `Decision-support for your fruit crops`.
- Primary Action `FrostedCard` with 48px orange gradient camera circle, `Take or Choose Photo`, storage blurb, and dual buttons (`Camera` and `Pick from Gallery`).
- Recent Activity `FrostedCard` containing active monitoring item (`🥭`, `Day 10 Scheduled` warning badge, prompt) and latest scan item (`🥭`, crop title, `Local` badge, finding, date).
- Supported Crops grid (3 columns: Mango, Banana, Papaya with circular emoji avatars and variety subtitles).
- Climate Snapshot `FrostedCard` with 4px blue left border, location pin, `Climate Normals` badge, 29°C temperature, and weather icon.

- [ ] **Step 3: Run test to verify it passes**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/features/__tests__/redesignHomeHistory.test.tsx`
Expected: PASS

- [ ] **Step 4: Run typecheck and commit**

Run: `npm --prefix app run typecheck`
```bash
git add app/src/features/home/HomeScreen.tsx app/src/features/__tests__/redesignHomeHistory.test.tsx
git commit -m "feat(home): implement exact 1:1 prototype home dashboard"
```

---

### Task 5: Screen 2 (Camera Viewfinder) 1:1 Implementation

**Files:**
- Modify: `app/src/features/capture/CaptureScreen.tsx`
- Modify: `app/src/features/capture/CameraCapture.tsx`
- Modify: `app/src/features/capture/__tests__/cameraControls.test.tsx`

**Interfaces:**
- Consumes: Camera controls, device permissions, gallery pickers.
- Produces: Exact 1-to-1 layout of `scripts/prototype_screens/camera.html`.

- [ ] **Step 1: Write test for camera controls and reticle layout**

```tsx
// in app/src/features/capture/__tests__/cameraControls.test.tsx
it('renders viewfinder with top controls, dashed reticle, and shutter bar', () => {
  render(
    <CaptureScreen
      onCapture={jest.fn()}
      onClose={jest.fn()}
      onPickGallery={jest.fn()}
      activeCamera="back"
      onFlipCamera={jest.fn()}
      flashMode="auto"
      onToggleFlash={jest.fn()}
    />
  );
  expect(screen.getByLabelText(/isara ang camera|close camera/i)).toBeTruthy();
  expect(screen.getByText(/On-Device Only|Lokal na Device Lamang/i)).toBeTruthy();
  expect(screen.getByText(/Center the fruit within the frame|Itapat ang prutas/i)).toBeTruthy();
});
```

- [ ] **Step 2: Update `CameraCapture.tsx` and `CaptureScreen.tsx`**

Implement:
- Full viewport `#0c140e` with 24px border radius.
- Top Bar: 44px circular close button (`✕`), centered `🔒 On-Device Only` pill, 44px circular flash toggle (`⚡`).
- Viewfinder Target Frame: Inset reticle with `2.5px dashed rgba(74, 222, 128, 0.85)`, inner glow shadow, centered text `Center the fruit within the frame` and `Ensure natural lighting and steady focus on lesions`.
- Bottom Shutter Bar: 48px circular gallery picker (`🖼️`), 76px shutter button with 60px orange gradient center FAB, 48px circular camera flip button (`🔄`).

- [ ] **Step 3: Run test to verify it passes**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/features/capture/__tests__/cameraControls.test.tsx`
Expected: PASS

- [ ] **Step 4: Run typecheck and commit**

Run: `npm --prefix app run typecheck`
```bash
git add app/src/features/capture/CaptureScreen.tsx app/src/features/capture/CameraCapture.tsx app/src/features/capture/__tests__/cameraControls.test.tsx
git commit -m "feat(capture): implement exact 1:1 prototype camera viewfinder"
```

---

### Task 6: Screen 3 & Screen 4 (Scan Detection Result & Illustrative Result) 1:1 Implementation

**Files:**
- Modify: `app/src/features/result/CaptureResultScreen.tsx`
- Modify: `app/src/features/result/ResultScreen.tsx`
- Modify: `app/src/features/__tests__/redesignResults.test.tsx`

**Interfaces:**
- Consumes: `ScanResult`, saved photo metadata, `GreenTopCell`, `FrostedCard`, `BtnOrangeFull`, `BtnForestFull`, `BtnOutline`, `BtnSubtle`, `StatusBadge`
- Produces: Exact 1-to-1 layouts of `captureResult.html` and `result.html`.

- [ ] **Step 1: Write test for result screens and demo test button**

```tsx
// in app/src/features/__tests__/redesignResults.test.tsx
it('renders CaptureResultScreen with auto-detected card and demo button', () => {
  const onDemo = jest.fn();
  render(
    <CaptureResultScreen
      cropName="Mango (Carabao)"
      cropScientific="Mangifera indica"
      cropEmoji="🥭"
      matchPercentage="96%"
      recordId="SCAN-2026-0043"
      locationCoords="14.17°N, 121.24°E"
      onRetake={jest.fn()}
      onBrowseKnowledge={jest.fn()}
      onStartMonitoring={jest.fn()}
      onOpenDemoResult={onDemo}
    />
  );
  expect(screen.getByText(/Scan Detection Result/i)).toBeTruthy();
  expect(screen.getByText(/Auto-Detected Fruit Crop/i)).toBeTruthy();
  expect(screen.getByText(/Disease Diagnosis: No Model Weights/i)).toBeTruthy();
  const demoBtn = screen.getByText(/View Illustrative Sample Screen/i);
  expect(demoBtn).toBeTruthy();
  fireEvent.press(demoBtn);
  expect(onDemo).toHaveBeenCalledTimes(1);
});

it('renders ResultScreen matching illustrative prototype v2 layout', () => {
  render(
    <ResultScreen
      cropName="Mango (Carabao)"
      cropEmoji="🥭"
      diseaseName="Anthracnose"
      diseaseScientific="Colletotrichum gloeosporioides"
      severityLabel="MODERATE"
      severityPercentage="28.5%"
      severityCircleText="28%"
      onStartMonitoring={jest.fn()}
    />
  );
  expect(screen.getByText(/Illustrative Sample Scenario/i)).toBeTruthy();
  expect(screen.getByText(/28.5% • KATAMTAMAN \(MODERATE\)/i)).toBeTruthy();
  expect(screen.getByText(/Agronomic Guidance \(Decision-Support\)/i)).toBeTruthy();
});
```

- [ ] **Step 2: Update `CaptureResultScreen.tsx` and `ResultScreen.tsx`**

`CaptureResultScreen.tsx`:
- `GreenTopCell` with `Retake` pill button.
- Auto-Detected Fruit `FrostedCard` with 4px green left border, `#f0fdf4` surface, 48px circle avatar (`🥭`), `96% Match` healthy badge, localized crop title, and botanical description.
- Truthful Degradation `FrostedCard` with 4px amber left border and no model weights disclosure.
- Stored Photo `FrostedCard` displaying `#16241a` photo container, SQLite save confirmation, record ID, and rounded GPS tag.
- 3 Action Pathways: `Browse Local Crop Knowledge` (`BtnForestFull`), `Start Manual Monitoring Session` (`BtnOutline`), and `[Demo Test] View Illustrative Sample Screen` (`BtnSubtle`, orange text).

`ResultScreen.tsx`:
- Illustrative Notice `FrostedCard` with dashed amber border, `#fffbeb` surface, `Illustrative Sample Scenario` badge, and thesis demo disclosure.
- Result Banner: Forest green header with 38px crop emoji, crop title, `Auto-Detected Crop (96% Match)` subtitle, and `Demo` badge.
- Possible Finding `FrostedCard`: Uppercase `Tentative Indication`, `Moderate` warning badge, and disease heading.
- Severity Evaluation `FrostedCard`: `Estimated Lesion Area Ratio`, large text `28.5% • KATAMTAMAN (MODERATE)`, and 50px circular ring gauge with `28%`.
- Agronomic Guidance `FrostedCard` with pale green surface, `BPI Technical Notes` badge, and 3 categorized bullets: Sanitation, Precaution, Referral.
- Primary CTA: `Start Monitoring Session` (`BtnOrangeFull`) with arrow.

- [ ] **Step 3: Run test to verify it passes**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/features/__tests__/redesignResults.test.tsx`
Expected: PASS

- [ ] **Step 4: Run typecheck and commit**

Run: `npm --prefix app run typecheck`
```bash
git add app/src/features/result/CaptureResultScreen.tsx app/src/features/result/ResultScreen.tsx app/src/features/__tests__/redesignResults.test.tsx
git commit -m "feat(results): implement exact 1:1 prototype scan detection and illustrative result screens"
```

---

### Task 7: Screen 5 & Screen 6 (Monitoring List & Checkpoint Observation) 1:1 Implementation

**Files:**
- Modify: `app/src/features/monitoring/MonitoringListScreen.tsx`
- Modify: `app/src/features/monitoring/MonitoringScreen.tsx`
- Modify: `app/src/features/monitoring/__tests__/monitoringListScreen.test.tsx`
- Modify: `app/src/features/monitoring/__tests__/monitoringScreen.test.tsx`

**Interfaces:**
- Consumes: `useMonitoringList`, `useMonitoring`, `GreenTopCell`, `FrostedCard`, `BtnForestFull`, `StatusBadge`, `CropCircleAvatar`
- Produces: Exact 1-to-1 layouts of `monitoringList.html` and `recovery.html`.

- [ ] **Step 1: Write tests for monitoring screens**

```tsx
// in app/src/features/monitoring/__tests__/monitoringListScreen.test.tsx
it('renders MonitoringListScreen with filter chips and session cards', () => {
  render(
    <MonitoringListScreen
      sessions={[
        { id: '1', title: 'Carabao Mango #042', crop: 'mango', status: 'active', issue: 'Suspected Anthracnose', startDate: 'Oct 1, 2026' }
      ]}
      activeFilter="all"
      onSelectFilter={jest.fn()}
      onSelectSession={jest.fn()}
      onNewSession={jest.fn()}
    />
  );
  expect(screen.getByText(/Crop Monitoring/i)).toBeTruthy();
  expect(screen.getByText(/Carabao Mango #042/i)).toBeTruthy();
  expect(screen.getByText(/Suspected Anthracnose/i)).toBeTruthy();
});

// in app/src/features/monitoring/__tests__/monitoringScreen.test.tsx
it('renders MonitoringScreen observation grid and timeline', () => {
  render(
    <MonitoringScreen
      checkpointTitle="Mangga Carabao #042 • Day 10 Checkpoint"
      currentDay="Day 10 (Today)"
      observationDate="October 9, 2026"
      selectedObservation={null}
      onSelectObservation={jest.fn()}
      notes=""
      onChangeNotes={jest.fn()}
      onSave={jest.fn()}
      onBack={jest.fn()}
    />
  );
  expect(screen.getByText(/Record Observation/i)).toBeTruthy();
  expect(screen.getByText(/Day 10 \(Today\)/i)).toBeTruthy();
  expect(screen.getByText(/Mas Mabuti|Better/i)).toBeTruthy();
  expect(screen.getByText(/Save Observation to SQLite/i)).toBeTruthy();
});
```

- [ ] **Step 2: Update `MonitoringListScreen.tsx` and `MonitoringScreen.tsx`**

`MonitoringListScreen.tsx`:
- `GreenTopCell` with `Crop Monitoring` title, 10-day tracking subtitle, and `+ New` pill button.
- Horizontal filter bar with `All`, `Active`, `Completed`.
- Session cards list with 44px avatar (`🥭` or `🍌`), session title, status badge (`badge-warning` / `badge-healthy`), issue description, start date, and right arrow chevron.
- Bottom Action: `Start from New Photo` (`BtnForestFull`) with camera icon.

`MonitoringScreen.tsx`:
- `GreenTopCell` with `Record Observation`, checkpoint subtitle, and `← Back` action.
- Timeline Progress `FrostedCard`: Checkpoint labels (`Day 1`, `Day 5`, `Day 10 Today` in bold orange), 6px progress track filled with forest green bar, actual date caption.
- Observation Grid `FrostedCard`:
  - 4 choice buttons in 2x2 grid (`🌱 Better`, `⚖️ About Same`, `⚠️ Worse`, `❓ Unsure`) with visual highlight when selected.
  - Field notes textarea input.
  - Submit CTA: `Save Observation to SQLite` (`BtnForestFull`) with check icon.

- [ ] **Step 3: Run test to verify it passes**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/features/monitoring/__tests__/monitoringListScreen.test.tsx src/features/monitoring/__tests__/monitoringScreen.test.tsx`
Expected: PASS

- [ ] **Step 4: Run typecheck and commit**

Run: `npm --prefix app run typecheck`
```bash
git add app/src/features/monitoring/MonitoringListScreen.tsx app/src/features/monitoring/MonitoringScreen.tsx app/src/features/monitoring/__tests__/
git commit -m "feat(monitoring): implement exact 1:1 prototype monitoring list and checkpoint screens"
```

---

### Task 8: Screen 7 & Screen 8 (Scan History & Climate Suitability) 1:1 Implementation

**Files:**
- Modify: `app/src/features/history/HistoryScreen.tsx`
- Modify: `app/src/features/climate/ClimateScreen.tsx`
- Modify: `app/src/features/climate/__tests__/ClimateScreen.test.tsx`
- Modify: `app/src/features/__tests__/redesignHomeHistory.test.tsx`

**Interfaces:**
- Consumes: Scans repository, Open-Meteo normals data, `GreenTopCell`, `FrostedCard`, `BtnForestFull`, `StatusBadge`, `CropCircleAvatar`
- Produces: Exact 1-to-1 layouts of `history.html` and `climate.html`.

- [ ] **Step 1: Write test for history and climate screens**

```tsx
// in app/src/features/climate/__tests__/ClimateScreen.test.tsx
it('renders ClimateScreen with 3-metric grid and 12-month histogram', () => {
  render(
    <ClimateScreen
      locationName="Davao City, Region XI"
      suitabilityHeadline="Mango: Highly Suitable"
      seasonLabel="Induction Season"
      rationale="Temperature supports floral bud development"
      humidity="78%"
      rainfall="1.4 mm"
      elevation="32 m"
      onChangeLocation={jest.fn()}
      onBackHome={jest.fn()}
    />
  );
  expect(screen.getByText(/Climate & Suitability/i)).toBeTruthy();
  expect(screen.getByText(/Mango: Highly Suitable/i)).toBeTruthy();
  expect(screen.getByText(/12-Month Rainfall Normals/i)).toBeTruthy();
});
```

- [ ] **Step 2: Update `HistoryScreen.tsx` and `ClimateScreen.tsx`**

`HistoryScreen.tsx`:
- `GreenTopCell` with `Scan History`, SQLite local persistence subtitle, and `← Home` action.
- Search input container with magnifying glass icon `🔍`.
- Filter chips: `All (N)`, `🥭 Mangga`, `🍌 Saging`, `🍈 Papaya`.
- Records list with 44px crop avatars in `#eaf4ed`, crop title, `Local` badge, finding summary, record ID, date string, right arrow.

`ClimateScreen.tsx`:
- `GreenTopCell` with `Climate & Suitability`, coarse location string, and `Change` pill button.
- Suitability `FrostedCard` with 4px green left border, fruit emoji (`🥭`), suitability heading, `Induction Season` healthy badge, and agronomic rationale.
- 3-Metric Climate Grid: 3-column layout of `#f8faf9` rounded cards for Humidity (`💧`), Rainfall (`🌧️`), Elevation (`⛰️`).
- 12-Month Climate Normals Histogram: `12-Month Rainfall Normals` with `1991–2020 Baseline` caption, 12 vertical colored bars (sky blue, green, deep forest), and month labels (`Ene` to `Dis`).
- Action CTA: `← Back to Home` (`BtnForestFull`).

- [ ] **Step 3: Run test to verify it passes**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/features/climate/__tests__/ClimateScreen.test.tsx`
Expected: PASS

- [ ] **Step 4: Run typecheck and commit**

Run: `npm --prefix app run typecheck`
```bash
git add app/src/features/history/HistoryScreen.tsx app/src/features/climate/ClimateScreen.tsx app/src/features/climate/__tests__/ClimateScreen.test.tsx
git commit -m "feat(history-climate): implement exact 1:1 prototype scan history and climate screens"
```

---

### Task 9: Screen 9 & Screen 10 (Location Picker & Crop Encyclopedia) 1:1 Implementation

**Files:**
- Modify: `app/src/features/location/LocationPickerScreen.tsx`
- Modify: `app/src/features/varietyInfo/VarietyInfoScreen.tsx`
- Modify: `app/src/features/__tests__/screens.test.tsx`

**Interfaces:**
- Consumes: Compiled fruit variety knowledge, location presets, `GreenTopCell`, `FrostedCard`, `BtnOrangeFull`, `BtnForestFull`, `StatusBadge`
- Produces: Exact 1-to-1 layouts of `location.html` and `varietyInfo.html`.

- [ ] **Step 1: Write test for location and varietyInfo screens**

```tsx
// in app/src/features/__tests__/screens.test.tsx
it('renders LocationPickerScreen matching prototype presets', () => {
  render(
    <LocationPickerScreen
      currentLocation="Davao City, Davao del Sur"
      onSelectLocation={jest.fn()}
      onUseDeviceGps={jest.fn()}
      onCancel={jest.fn()}
    />
  );
  expect(screen.getByText(/Select Location/i)).toBeTruthy();
  expect(screen.getByText(/Davao City, Davao del Sur/i)).toBeTruthy();
  expect(screen.getByText(/Use Device GPS/i)).toBeTruthy();
});

it('renders VarietyInfoScreen matching prototype 2x2 threshold grid', () => {
  render(
    <VarietyInfoScreen
      selectedCrop="mango"
      onSelectCrop={jest.fn()}
      onScanCrop={jest.fn()}
      onBackHome={jest.fn()}
    />
  );
  expect(screen.getByText(/Carabao Mango/i)).toBeTruthy();
  expect(screen.getByText(/Agronomic Thresholds/i)).toBeTruthy();
  expect(screen.getByText(/Key Vulnerabilities/i)).toBeTruthy();
  expect(screen.getByText(/Scan this Crop/i)).toBeTruthy();
});
```

- [ ] **Step 2: Update `LocationPickerScreen.tsx` and `VarietyInfoScreen.tsx`**

`LocationPickerScreen.tsx`:
- `GreenTopCell` with `Select Location`, coarse location explanation, and `✕ Cancel` button.
- Input `FrostedCard` with city input and selectable presets (Davao City with checkmark, pale green background, and `Current` badge; Tagum City, General Santos City, Cagayan de Oro).
- Action CTA: `🛰️ Use Device GPS` (`BtnForestFull`).

`VarietyInfoScreen.tsx`:
- `GreenTopCell` with crop title (e.g. `🥭 Carabao Mango`), botanical name, and `← Home` button.
- 3 Crop Tabs: `🥭 Mango`, `🍌 Banana`, `🍈 Papaya`.
- Agronomic Thresholds `FrostedCard`: 2x2 grid of `#f8faf9` tiles (Temperature, Annual Rainfall, Elevation, Soil pH).
- Key Vulnerabilities `FrostedCard`: Red highlight containers (`#fef2f2`) detailing diseases like Anthracnose and Stem End Rot.
- Action CTA: `Scan this Crop` (`BtnOrangeFull`) with camera icon.

- [ ] **Step 3: Run test to verify it passes**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/features/__tests__/screens.test.tsx`
Expected: PASS

- [ ] **Step 4: Run typecheck and commit**

Run: `npm --prefix app run typecheck`
```bash
git add app/src/features/location/LocationPickerScreen.tsx app/src/features/varietyInfo/VarietyInfoScreen.tsx app/src/features/__tests__/screens.test.tsx
git commit -m "feat(location-variety): implement exact 1:1 prototype location picker and crop encyclopedia screens"
```

---

### Task 10: Screen 11 (Agro-Assistant with Sliding History Drawer) 1:1 Implementation

**Files:**
- Modify: `app/src/features/chat/ChatScreen.tsx`
- Modify: `app/src/features/chat/ConversationSidebar.tsx`
- Modify: `app/src/features/chat/__tests__/redesignAssistant.test.tsx`

**Interfaces:**
- Consumes: `useChat`, `useConversationsUi`, `GreenTopCell`, `FrostedCard`, `BtnOrangeFull`, `BtnSubtle`
- Produces: Exact 1-to-1 layout of `scripts/prototype_screens/chat.html`.

- [ ] **Step 1: Write test for chat screen and history drawer**

```tsx
// in app/src/features/chat/__tests__/redesignAssistant.test.tsx
it('renders ChatScreen with drawer trigger, safety banner, and bubbles', () => {
  render(
    <ChatScreen
      activeTitle="Mango Leaf Spot Question"
      messages={[
        { id: '1', sender: 'bot', text: 'Hello! I am your PrutasAI Agro-Assistant.' },
        { id: '2', sender: 'user', text: 'How do I manage anthracnose?' }
      ]}
      draftText=""
      onChangeDraft={jest.fn()}
      onSend={jest.fn()}
      onOpenDrawer={jest.fn()}
      onNewChat={jest.fn()}
    />
  );
  expect(screen.getByText(/Mango Leaf Spot Question/i)).toBeTruthy();
  expect(screen.getByText(/Curated Offline Knowledge/i)).toBeTruthy();
  expect(screen.getByText(/Decision support only/i)).toBeTruthy();
  expect(screen.getByText(/🌾 PrutasAI Bot/i)).toBeTruthy();
  expect(screen.getByText(/How do I manage anthracnose\?/i)).toBeTruthy();
});
```

- [ ] **Step 2: Update `ChatScreen.tsx` and `ConversationSidebar.tsx`**

Implement:
- `GreenTopCell` with `☰` drawer button, active chat title, `Curated Offline Knowledge` subtitle, and `+ New` pill button.
- Safety Disclaimer Banner: Soft blue bar `#e0f2fe` with shield icon `🛡️` and advisory text.
- History Drawer Overlay: Slide-out drawer with `🌾 Past Chats`, close button `✕`, `+ Start New Chat` button, recent conversations list with trash deletion buttons (`🗑️`).
- Transcript Messages:
  - Bot messages: Left-aligned white frosted card with rounded corners (`14px 14px 14px 4px`), header `🌾 PrutasAI Bot` in forest green.
  - User messages: Right-aligned forest green bubble with rounded corners (`14px 14px 4px 14px`) and white text.
- Composer Bar: Text input with 44px minimum height and 44px orange gradient send button (`➔`).

- [ ] **Step 3: Run test to verify it passes**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/features/chat/__tests__/redesignAssistant.test.tsx`
Expected: PASS

- [ ] **Step 4: Run typecheck and commit**

Run: `npm --prefix app run typecheck`
```bash
git add app/src/features/chat/ChatScreen.tsx app/src/features/chat/ConversationSidebar.tsx app/src/features/chat/__tests__/redesignAssistant.test.tsx
git commit -m "feat(chat): implement exact 1:1 prototype agro-assistant screen and history drawer"
```

---

### Task 11: Screen 12 to Screen 16 (Account, Login, Create Account, Email Confirm, Forgot Password) 1:1 Implementation

**Files:**
- Modify: `app/src/features/account/AccountScreen.tsx`
- Modify: `app/src/features/account/LoginScreen.tsx`
- Modify: `app/src/features/account/SignUpScreen.tsx`
- Modify: `app/src/features/account/EmailConfirmationScreen.tsx`
- Modify: `app/src/features/account/ForgotPasswordScreen.tsx`
- Modify: `app/src/features/account/__tests__/redesignAccount.test.tsx`

**Interfaces:**
- Consumes: `AccountSync`, `GreenTopCell`, `FrostedCard`, `BtnOrangeFull`, `BtnForestFull`, `BtnOutline`, `BtnSubtle`, `StatusBadge`
- Produces: Exact 1-to-1 layouts of `account.html`, `login.html`, `createAccount.html`, `emailConfirm.html`, and `forgotPassword.html`.

- [ ] **Step 1: Write tests for account and auth screens**

```tsx
// in app/src/features/account/__tests__/redesignAccount.test.tsx
it('renders AccountScreen in guest mode matching prototype', () => {
  render(
    <AccountScreen
      isLoggedIn={false}
      userEmail={null}
      currentLanguage="EN"
      currentLocation="Davao City"
      trashedCount={1}
      onLogin={jest.fn()}
      onCreateAccount={jest.fn()}
      onToggleLanguage={jest.fn()}
      onOpenLocation={jest.fn()}
      onOpenModelStatus={jest.fn()}
      onOpenTrash={jest.fn()}
    />
  );
  expect(screen.getByText(/Account & Settings/i)).toBeTruthy();
  expect(screen.getByText(/Guest Farmer/i)).toBeTruthy();
  expect(screen.getByText(/Log In/i)).toBeTruthy();
  expect(screen.getByText(/Create Account/i)).toBeTruthy();
  expect(screen.getByText(/Cloud Synchronization \(Optional\)/i)).toBeTruthy();
  expect(screen.getByText(/Trash \(15-Day Retention\)/i)).toBeTruthy();
});
```

- [ ] **Step 2: Update `AccountScreen.tsx` and auth form screens**

`AccountScreen.tsx`:
- `GreenTopCell` with `Account & Settings` title, subtitle, and gear icon.
- Profile `FrostedCard`: 48px avatar (`👨‍🌾` or `👤`), name, status. Guest mode shows dual buttons: `Log In` (`BtnOutline`) and `Create Account` (`BtnForestFull`). Authenticated shows subtle red `Sign Out`.
- Cloud Sync `FrostedCard`: Discloses photo privacy (photos stay on device) and offers `🔒 Local Offline Only` (`BtnForestFull`) vs `☁️ Sync Metadata` (`BtnOutline`).
- App Preferences `FrostedCard`: Language row with `🇵🇭 FIL` / `🇺🇸 EN` badge, Location row with chevron, AI Model Registry row with `Offline` badge, Trash row with red text.

`LoginScreen.tsx`, `SignUpScreen.tsx`, `EmailConfirmationScreen.tsx`, `ForgotPasswordScreen.tsx`:
- Implement matching `login.html`, `createAccount.html`, `emailConfirm.html`, and `forgotPassword.html` with exact fields, helper texts, password visibility toggles, privacy disclosure boxes, and submission buttons.

- [ ] **Step 3: Run test to verify it passes**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/features/account/__tests__/redesignAccount.test.tsx`
Expected: PASS

- [ ] **Step 4: Run typecheck and commit**

Run: `npm --prefix app run typecheck`
```bash
git add app/src/features/account/ app/src/features/account/__tests__/redesignAccount.test.tsx
git commit -m "feat(account): implement exact 1:1 prototype account and auth screens"
```

---

### Task 12: Screen 17 to Screen 19 (AI Model Registry, Trash, Welcome) & Final Verification

**Files:**
- Modify: `app/src/features/modelStatus/ModelStatusScreen.tsx`
- Modify: `app/src/features/modelStatus/ModelStatusView.tsx`
- Modify: `app/src/features/trash/TrashScreen.tsx`
- Modify: `app/src/features/welcome/WelcomeScreen.tsx`
- Modify: `app/src/features/__tests__/redesignSupportingStates.test.tsx`

**Interfaces:**
- Consumes: Trashed conversations, model registry statuses, onboarding state, `GreenTopCell`, `FrostedCard`, `BtnForestFull`, `StatusBadge`
- Produces: Exact 1-to-1 layouts of `modelStatus.html`, `trash.html`, and `welcome.html`.

- [ ] **Step 1: Write test for supporting screens**

```tsx
// in app/src/features/__tests__/redesignSupportingStates.test.tsx
it('renders ModelStatusScreen matching prototype stages', () => {
  render(<ModelStatusScreen onBack={jest.fn()} />);
  expect(screen.getByText(/AI Model Registry/i)).toBeTruthy();
  expect(screen.getByText(/Thesis Phase Disclosure/i)).toBeTruthy();
  expect(screen.getByText(/Stage 1: Fruit Detector \(YOLO\)/i)).toBeTruthy();
  expect(screen.getByText(/Stage 2: Variety Classifier/i)).toBeTruthy();
  expect(screen.getByText(/Stage 3: Disease & Lesion Segmentation/i)).toBeTruthy();
});

it('renders TrashScreen with 15-day notice and restore button', () => {
  render(
    <TrashScreen
      trashedItems={[{ id: '1', title: 'Anthracnose chat', deletedDate: 'Deleted Oct 8, 2026' }]}
      onRestore={jest.fn()}
      onBack={jest.fn()}
    />
  );
  expect(screen.getByText(/Trash Manager/i)).toBeTruthy();
  expect(screen.getByText(/Anthracnose chat/i)).toBeTruthy();
  expect(screen.getByText(/Restore/i)).toBeTruthy();
});

it('renders WelcomeScreen matching prototype onboarding cards', () => {
  render(
    <WelcomeScreen
      currentLanguage="FIL"
      onSelectLanguage={jest.fn()}
      onContinueOffline={jest.fn()}
      onCreateAccount={jest.fn()}
      onLogin={jest.fn()}
    />
  );
  expect(screen.getByText(/Maligayang Pagdating sa PrutasAI/i)).toBeTruthy();
  expect(screen.getByText(/Continue Fully Offline \(Recommended\)/i)).toBeTruthy();
  expect(screen.getByText(/Create Account \(Optional Sync\)/i)).toBeTruthy();
});
```

- [ ] **Step 2: Update `ModelStatusScreen.tsx`, `TrashScreen.tsx`, and `WelcomeScreen.tsx`**

`ModelStatusScreen.tsx`:
- `GreenTopCell` with `AI Model Registry` and `← Back`.
- Disclosure `FrostedCard` with 4px amber left border explaining no model weights are bundled.
- Pipeline Stages `FrostedCard` listing YOLO detector, Variety classifier, and Lesion segmentation with `No Weights` badges.
- Back button (`BtnForestFull`).

`TrashScreen.tsx`:
- `GreenTopCell` with `Trash Manager` and `← Back`.
- Notice `FrostedCard` (`#fff5f5` surface, `#fecaca` border, `#991b1b` text) explaining chat 15-day soft delete vs photo instant purge.
- Trashed list items with red deletion date and `Restore` button (`#eaf4ed` background, forest green text).
- Back button (`BtnForestFull`).

`WelcomeScreen.tsx`:
- `GreenTopCell` with 52px orange circular icon `🍊`, `Maligayang Pagdating sa PrutasAI` title, crop scope subtitle.
- Language `FrostedCard` with `🇵🇭 FIL` and `🇺🇸 EN` toggle buttons.
- Path 1 `FrostedCard` (2px forest border, lock icon, `Continue Fully Offline (Recommended)`).
- Path 2 `FrostedCard` (cloud icon, `Create Account (Optional Sync)`).
- Footer Link: `Already have an account? Log In`.

- [ ] **Step 3: Run test to verify it passes**

Run: `npm --prefix app test -- --runInBand --runTestsByPath src/features/__tests__/redesignSupportingStates.test.tsx`
Expected: PASS

- [ ] **Step 4: Run full project verification**

Run: `npm --prefix app run typecheck`
Run: `npm test`
Expected: All suites PASS cleanly.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/modelStatus/ app/src/features/trash/ app/src/features/welcome/ app/src/features/__tests__/redesignSupportingStates.test.tsx
git commit -m "feat(supporting): implement exact 1:1 prototype model status, trash, and welcome screens"
```
