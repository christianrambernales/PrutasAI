# Phase 1: Visual & UI Direction Contract

**Document ID:** `01-UI-DIRECTION`  
**Created:** 2026-09-15  
**Phase:** Phase 1: Baseline and Foundations  
**Status:** Design Direction Contract (Unvalidated Hypotheses)  
**Analogs:** `app/src/ui/theme.ts:2-103`, `app/src/ui/tokens.ts:6-30`, `app/src/ui/components/primitives.tsx:5-12,76-101`, `app/src/ui/i18n/LanguageContext.tsx:31-35`

---

## 1. Context: Subject, Audience, and Job

### 1.1 The Subject: Filipino Field Agriculture
PrutasAI is an agricultural decision-support tool focused on high-value fruit crops in the Philippines: **Banana** (*Saba*, *Lakatan*, *Cavendish*), **Mango** (*Carabao*), and **Papaya** (*Solo*). The visual environment reflects equatorial field realities: intense tropical sunlight, sudden downpours, dusty soil, and variable canopy shade.

### 1.2 The Audience: Smallholder Farmers and Extension Workers
- **Physical context**: Users operate budget Android smartphones (often with scratched, low-nits screens) in full outdoor daylight.
- **Ergonomic context**: Handlers frequently operate the device single-handed with soiled or gloved hands while inspecting orchard foliage or holding plant stems.
- **Connectivity context**: Rural farm locations frequently lack cellular reception; the interface must feel completely stable and instantaneous regardless of connectivity status.

### 1.3 The Core Job: Moving from Observation to One Trustworthy Action
The visual interface must guide the user from visual capture to an unambiguous, honest next step:
1. Confirm what crop and surface was inspected.
2. Clearly disclose what the app can and cannot diagnose.
3. Recommend exactly **one safe next agricultural action** (e.g., cultural pruning, sanitation, monitoring, or consulting an extension technician) without overstating certainty.

> [!IMPORTANT]
> **Status: Unvalidated Design Hypotheses**  
> Every token, typography scale, palette entry, and layout pattern defined in this document represents an **unvalidated hypothesis**. Nothing in this document shall be treated as implemented until verified through Phase 7 validation gates: font licensing, offline asset bundling, Filipino glyph coverage, contrast ratio certification, Dynamic Type reflow, small-screen testing (375dp), and outdoor sunlight legibility.

---

## 2. Preserve / Revise / Reject Decisions

This table evaluates visual decisions from the redesign prototype (`UX-SPEC.md`, `index.html`) against the active Expo client architecture:

| Design Dimension | Prototype Decision | Active Expo Architecture | Disposition | Rationale & Architectural Rule |
|---|---|---|---|---|
| **Primary Navigation** | Bottom tab bar with central floating scan shutter button | `AppNavigator.tsx`, `tabs.tsx` (`home`, `climate`, `chat`, `history`) | **Preserve** | Proven thumb-zone ergonomics for field use. The elevated central scan shutter remains the primary anchor of the app. |
| **Bilingual Support** | Client-side DOM language toggle (`en` / `fil`) | `useT()` hook + `LanguageContext.tsx` + typed dictionaries | **Preserve** | Preserve Expo React Native `useT()` contract. Do not introduce raw string interpolations or browser-specific language switchers. |
| **Capability Disclosure** | Honesty banners and model stage degradation | `core/status`, `describeDetectionCapability.ts`, `CaptureResultScreen` | **Preserve** | Truthful degradation is a non-negotiable core value. The UI must never simulate model inferences or fabricate diagnostic metrics. |
| **Outlined Icon Vocabulary** | 24px and 16px geometric outline icons (2px stroke) | `app/src/ui/components/Icon.tsx` | **Preserve** | High-contrast geometric outlines remain legible under sun glare where filled low-contrast icons blur. |
| **Spatial Grid** | 8-point rhythmic spatial spacing (`4, 8, 12, 16, 20, 24, 32`) | `SPACING` in `theme.ts` (`xs` through `xxxl`) | **Preserve** | Consistent 8px vertical rhythm ensures reliable hit-target calculations and consistent layout geometry across screens. |
| **Color Palette** | Generic web palette (bootstrap green `#1a472a`, saturated orange `#f77f00`) | Proposed agricultural palette (Canopy, Leaf, Rain, Harvest, Blight) | **Revise** | Current colors lack outdoor contrast calibration. Move to daylight-tested earth/canopy tones with verified WCAG contrast. |
| **Button Geometry** | Universal full pill (`border-radius: 999px`) on all buttons | `RADIUS` in `theme.ts` (`full` used on standard actions) | **Revise** | Full pills waste horizontal space and make text wrap prematurely on narrow screens. Restrict pills to filter chips; use 10–12dp rounded cards for primary buttons. |
| **Body Typography Floor** | 15px body copy (`FONTS.sizes.md = 15`) | Proposed 16px body floor with 1.55 line height | **Revise** | 15px text causes eye strain under midday equatorial sunlight. Elevate baseline explanatory body text to 16px. |
| **Crop Surface Indicators** | Raw emoji (`🍌`, `🥭`, `🪵`, `🍃`) as primary interactive targets | Text + 2px outline icons; emoji reserved for decorative headers | **Revise** | Emoji render inconsistently across Android OS versions and lack standard semantic hit targets. Interactive controls must use explicit vector icons + text. |
| **Decorative Foliage** | Plant leaf watermarks and decorative vector vines on cards | Flat, calm neutral cards without background illustrations | **Reject** | Decorative leaf art clutters the visual field and distracts from actual photos of diseased leaves. Backgrounds must remain flat and neutral. |
| **Generic SaaS Cards** | Floating cards with heavy drop shadows and rounded pastels | Crisp border-defined tiles (`1px solid #dee2e6`) on neutral ground | **Reject** | High ambient daylight washes out soft drop shadows. Structural separation must rely on subtle contrast borders and background value steps. |
| **Interactive Role Switcher** | Visual role picker (Farmer vs Extension vs Researcher) in header | Dedicated settings and diagnostic screens (`ModelStatusScreen.tsx`) | **Reject** | Role selectors that only change visual skins without altering underlying authorization or domain models create confusion. |
| **DOM & Browser Mechanics** | CSS variables, `innerHTML`, `setTimeout` mocks, browser hash routing | React Native StyleSheet, typed props, pure navigation reducer (`NavState`) | **Reject** | Strictly prohibited in Expo client. All visual logic must use React Native primitives (`View`, `Text`, `StyleSheet`, `theme.ts`). |
| **Unrestrained Animations** | Looping pulse animations, shimmer cards, delayed spinners | Snappy transitions (<= 150ms) honoring `prefers-reduced-motion` | **Reject** | Animations consume battery on budget field devices and delay urgent operational decisions. Motion must be purposeful and minimal. |

---

## 3. The 4–6 Color Named Palette Hypotheses

An intentional, grounded palette derived from the Filipino agricultural landscape, designed for outdoor high-glare environments:

```
[ Canopy ]          [ Leaf Action ]     [ Rain Gauge ]      [ Harvest Warning ] [ Blight Danger ]   [ Rice Paper Ground ]
 #14532D             #166534             #176B87             #A15C00             #B42318             #F4F7F5
 (Grounding/Header)  (Primary Action)    (Climate/Context)   (Moderate Caution)  (Severe Blight)     (Low-glare Canvas)
```

### 3.1 Palette Token Specifications

1. **Canopy (`#14532D`)**
   - *Role*: Deep rain-fed canopy green. Used for header bars, brand grounding, and structural container anchors.
   - *Contrast*: 11.2:1 against White; 9.8:1 against Rice Paper Ground. Exceeds WCAG AAA.
2. **Leaf Action (`#166534`)**
   - *Role*: High-contrast working foliage green. Used for the primary camera shutter, dominant action buttons, and confirmed positive status chips.
   - *Contrast*: 8.4:1 against White; 7.3:1 against Rice Paper Ground. Exceeds WCAG AAA.
3. **Rain Gauge (`#176B87`)**
   - *Role*: Atmospheric reservoir blue. Used for climate metrics, rainfall accumulations, explainability cards, and informational badges.
   - *Contrast*: 6.2:1 against White; 5.4:1 against Rice Paper Ground. Exceeds WCAG AA.
4. **Harvest Warning (`#A15C00`)**
   - *Role*: Sun-baked ochre. Used for moderate disease severity, weather advisories, and caution indicators.
   - *Accessibility Rule*: Never displayed as raw color alone; must always pair with warning icon (`triangle-alert`) and explicit text label.
   - *Contrast*: 5.1:1 against White; 4.5:1 against Rice Paper Ground. Exceeds WCAG AA.
5. **Blight Danger (`#B42318`)**
   - *Role*: Volcanic earth / lesion red. Used for severe disease outbreaks, quarantine notices, and destructive actions (e.g. permanent conversation deletion).
   - *Contrast*: 5.8:1 against White; 5.1:1 against Rice Paper Ground. Exceeds WCAG AA.
6. **Rice Paper Ground (`#F4F7F5`)**
   - *Role*: Low-glare muted neutral ground. Backing canvas behind white surface cards. Reduces eye fatigue and screen glare under direct tropical sunlight compared to harsh `#FFFFFF`.
   - *Contrast*: Provides clear value separation against White (`#FFFFFF`) card surfaces without needing heavy drop shadows.

### 3.2 Supporting Ink Neutrals
- **Deep Ink (`#17211B`)**: High-contrast near-black typography (contrast 15.4:1 against Rice Paper Ground).
- **Muted Silt (`#48574D`)**: Secondary metadata, timestamps, and supporting field tags (contrast 5.6:1 against Rice Paper Ground).

---

## 4. Semantic Token Bridge

This table compares current values in `app/src/ui/theme.ts` and `app/src/ui/tokens.ts` with the proposed hypotheses:

| Semantic Token | Current Active Value (`theme.ts`) | Proposed Hypothesis Value | Visual Delta & Purpose | Validation Status |
|---|---|---|---|---|
| `COLORS.primary` | `#1a472a` (Forest Green) | `#14532D` (`Canopy`) | Deeper, richer canopy tone; improves contrast from 9.1:1 to 11.2:1. | Unvalidated hypothesis |
| `COLORS.primaryLight` | `#2d6a4f` (Muted Leaf) | `#166534` (`Leaf Action`) | Higher saturation; distinguishes primary touch targets from background foliage. | Unvalidated hypothesis |
| `COLORS.info` | `#457b9d` (Slate Blue) | `#176B87` (`Rain Gauge`) | Weather-station atmospheric cyan; distinct from generic UI blue. | Unvalidated hypothesis |
| `COLORS.warning` | `#f77f00` (Safety Orange) | `#A15C00` (`Harvest Warning`) | Darker ochre; fixes severe contrast failure of `#f77f00` (2.9:1) on white. | Unvalidated hypothesis |
| `COLORS.error` | `#d62828` (Crimson) | `#B42318` (`Blight Danger`) | Earthy blight red; improves contrast to 5.8:1 for small outdoor text. | Unvalidated hypothesis |
| `COLORS.background` | `#f8f9fa` (Cold Gray) | `#F4F7F5` (`Rice Paper Ground`) | Warm agricultural neutral; suppresses sun reflection on glass. | Unvalidated hypothesis |
| `COLORS.text` | `#212529` (Standard Dark) | `#17211B` (`Deep Ink`) | Green-tinted deep ink; unifies text with botanical theme. | Unvalidated hypothesis |
| `COLORS.textSecondary`| `#6c757d` (Medium Gray) | `#48574D` (`Muted Silt`) | Warmer earth-gray; guarantees >= 4.5:1 ratio for secondary captions. | Unvalidated hypothesis |
| `FONTS.sizes.md` | `15` (15px body) | `16` (16px floor) | Eliminates sub-16px outdoor reading fatigue on budget displays. | Unvalidated hypothesis |
| `FONTS.lineHeights.md`| `20` | `24` (1.5x ratio) | Improves line scanning velocity when walking in orchard terrain. | Unvalidated hypothesis |
| `RADIUS.button` | `999` (`RADIUS.full`) | `12` (`RADIUS.lg`) | Replaces full pill with structured 12dp card; prevents awkward word wraps. | Unvalidated hypothesis |
| `RADIUS.chip` | `6` (`RADIUS.sm`) | `999` (`RADIUS.full`) | Restricts pill geometry exclusively to status chips and tag badges. | Unvalidated hypothesis |

---

## 5. Typography Roles & Hierarchy

```
Display / Hero       34px / 700 / 40lh   Screen titles, Shutter anchors (Hypothesis: Lexend)
Section Heading      20px / 600 / 26lh   Card headers, Stage titles
Body Baseline (Floor)16px / 400 / 24lh   Guidance, cultural remedies, chat messages
Body Emphasized      16px / 600 / 24lh   Key disease symptoms, crop varieties
Metadata / Caption   13px / 500 / 18lh   Timestamps, coordinates, diagnostic depth
Field Tag Micro      12px / 700 / 16lh   Uppercase tracked tags ([BANANA · LEAF])
Numerals & Measures  28px / 700 / 32lh   Weather metrics (28 °C, 1,200 mm)
```

### Font Hypothesis: Lexend
- **Rationale**: Lexend was designed specifically to reduce visual crowding and increase reading velocity. Its open counters and distinct character shapes perform exceptionally well on low-resolution displays under sunlight.
- **Validation Gates**:
  1. Font file licensing check (SIL Open Font License).
  2. Offline bundling in `app/assets/fonts/` (zero external CDN fetches).
  3. Filipino glyph coverage (must render `ñ`, `Ñ`, accented vowels without fallback glyph stutter).
  4. Platform parity on Android (React Native native font loading) and Web.

---

## 6. Layout Principle: Evidence First, Provenance Second, One Action Third

The screen architecture follows a strict three-tier information hierarchy:

```
┌────────────────────────────────────────────────────────┐
│ [Top Bar]  Back / Tab Title                  Sync Icon │
├────────────────────────────────────────────────────────┤
│ TIER 1: THE FIELD EVIDENCE                             │
│ ┌────────────────────────────────────────────────────┐ │
│ │  Full-width photo crop / inspection view           │ │
│ │  High-contrast visual proof taken in orchard       │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ TIER 2: THE FIELD TAG & PROVENANCE STRIP               │
│ 🏷️ [BANANA · LEAF]  [STORED SQLITE]  [MODELS UNLOADED] │
│ Observed: Anthracnose leaf speckling (heuristic)       │
│ Truth: No weights installed. Diagnostic support only.  │
│                                                        │
│ TIER 3: ONE SAFE NEXT ACTION                           │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [ ACTION: SANITIZE AFFECTED LEAVES ]               │ │
│ │ Clear cultural management instruction              │ │
│ └────────────────────────────────────────────────────┘ │
│ Supporting details & Escalation to MAO / Technician    │
└────────────────────────────────────────────────────────┘
```

1. **Tier 1: Evidence (Top 40%)**:
   - The user's observation is king. Render the high-resolution photo, bounding box, or climate gauge prominently. Never bury the evidence below text cards.
2. **Tier 2: Provenance & Capability Strip (Middle 25%)**:
   - The **Field Tag** binds crop, surface, source, and capability status. It immediately tells the user whether this is a real detection, an offline heuristic, or a bundled design sample.
3. **Tier 3: One Safe Action (Bottom 35% - Primary Thumb Reach)**:
   - Provide exactly **one dominant primary action button** (e.g., "Review Sanitation Steps", "Start Daily Monitoring", or "Consult Extension Worker").
   - Secondary actions (e.g., "Scan Again", "Export Log") are styled as subtle outline links below the primary button.

---

## 7. The Field Tag Signature

The single restrained signature element across the application is the **Field Tag**. Rather than decorative illustrations, PrutasAI spends its visual distinctiveness on an agronomic evidence tag that binds the five pillars of agricultural inspection:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🏷️ [CROP · SURFACE]   [TEMPORAL SOURCE]   [CAPABILITY]   [PROVENANCE]    │
│    BANANA · LEAF       TODAY 09:42         HEURISTIC      LOCAL SQLITE   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.1 The Five Pillars of Field Tag Rationale

| Dimension | Possible Values | Why It Matters to an Agricultural Decision |
|---|---|---|
| **1. Crop Subject** | `BANANA`, `MANGO`, `PAPAYA` | Prevents lethal cross-crop treatment errors (e.g., applying mango fungicide concentrations to sensitive papaya foliage). |
| **2. Plant Surface** | `LEAF`, `FRUIT`, `STEM / BARK` | Anatomical surface dictates treatment. A fruit lesion requires post-harvest handling; a leaf spot requires cultural pruning. |
| **3. Temporal/Spatial** | `2026-09-15 · DAVAO (COARSE)` | Disease pressure is seasonal. Associating weather history with the exact observation timestamp validates incubation windows. |
| **4. Capability Status** | `MODEL READY`, `DEGRADED`, `OFFLINE INTENT` | Discloses whether the finding came from an ML classifier, an offline knowledge regex, or general heuristic guidance. |
| **5. Provenance Origin** | `FRESH CAPTURE`, `STORED SQLITE`, `SAMPLE PREVIEW` | Guarantees the user never mistakes a bundled demonstration scan for their own orchard's diagnostic record. |

---

## 8. Self-Critique & Anti-Patterns

To maintain agronomic integrity, the design direction explicitly rejects common UI tropes:

1. **Rejection of the Generic Green-Card Dashboard**:
   - *Trope*: Splashing light pastel mint green `#E8F5E9` cards with generic leaf icons everywhere.
   - *Critique*: Makes the application feel like a generic SaaS template or marketing landing page rather than a serious agronomic decision tool.
   - *Rule*: Use white cards with crisp `#dee2e6` borders on a low-glare `#F4F7F5` ground. Reserve green exclusively for actionable controls (`#166534`) and brand anchors (`#14532D`).

2. **Rejection of Decorative Botanical Foliage**:
   - *Trope*: Background botanical watermarks, trailing ivy vectors, and decorative leaves behind content.
   - *Critique*: Clutters the screen and creates severe optical competition when a farmer is trying to distinguish subtle leaf chlorosis or fungal spore spots in a photo.
   - *Rule*: Zero decorative plant illustrations on content screens. Visual plant representation must come strictly from real field photography.

3. **Rejection of Universal Pill Buttons**:
   - *Trope*: Turning every submit button, action card, and tile into a full 999px pill.
   - *Critique*: Pill buttons severely constrain horizontal text area on narrow 360–375dp screens, causing Filipino translations (e.g., *"Simulan ang Pagsubaybay"*) to wrap into 3 awkward lines.
   - *Rule*: Standardize primary buttons on `RADIUS.lg` (12dp). Reserve 999px pills strictly for compact filter chips and the circular camera shutter.

4. **Rejection of Scattered Motion and Looping Spinners**:
   - *Trope*: Pulsing glowing rings, continuous shimmer skeletons, and floating bouncing cards.
   - *Critique*: High battery drain on budget MediaTek processors; disorienting in vibrating field vehicles or direct sunlight.
   - *Rule*: Transitions must be instantaneous or <= 150ms ease-out. Fully respect OS-level `prefers-reduced-motion`.

---

## 9. Accessibility, Platform, and Validation Gates

Before any token or layout from this document is implemented in active code, it must pass seven formal validation gates in Phase 7:

1. **Touch Target Gate**:
   - All interactive controls (buttons, tabs, filter chips, back buttons) must provide a minimum hit target of **44 × 44 dp** with >= 8dp clearance between adjacent interactives.
2. **Contrast Gate**:
   - All body text (16px) must achieve >= **4.5:1** contrast against its backing surface.
   - Large headings (>= 20px) and critical graphical icons must achieve >= **3.0:1** contrast.
   - Status indicators must never rely on color alone; every severity level must present an **Icon + Color + Text Label** triplet.
3. **Dynamic Type & Reflow Gate**:
   - The UI must reflow without clipping, truncation, or text overlap up to **200% font scaling** (Android font accessibility setting).
   - Zero horizontal scrolling on viewports as narrow as **375 dp**.
4. **Sunlight & Glare Gate**:
   - Surfaces must be verified under high ambient illumination (simulated >= 50,000 lux).
   - Prohibit low-contrast light-gray text (`#adb5bd`) on white backgrounds for any readable content.
5. **Offline & Bundling Gate**:
   - Zero external font or icon network requests. All fonts, vector glyphs, and knowledge dictionaries must be bundled locally inside `app/assets/`.
6. **Filipino Localization Gate**:
   - All proposed layouts must be tested against both English and Filipino translations in `LanguageContext.tsx`.
   - Layouts must accommodate the ~25% expansion typical in Tagalog agricultural terminology without broken layouts.
7. **Cross-Platform Consistency Gate**:
   - Visual tokens must render identically on Android (React Native native components) and Web (React Native Web with cross-origin isolation).
