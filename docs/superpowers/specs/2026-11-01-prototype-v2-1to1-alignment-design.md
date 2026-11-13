# Prototype v2 Exact 1:1 Visual and Layout Alignment Specification

- Date: 2026-11-01
- Target: PrutasAI Expo React Native (Android and Web)
- Reference Authority: `interactive-prototype-v2.html` and extracted screen templates in `scripts/prototype_screens/*.html`
- Architecture Strategy: Prototype-Mirror Component Library (Approach 1)

## 1. Executive Summary and Scope

### 1.1 Objective
The initial redesign implementation modernized application tokens but relied on generic React Native containers (`<Card>`, `<Section>`, default `AppBar`), resulting in visual drift from the approved prototype. This specification establishes the requirements, UI primitives, screen-by-screen component hierarchies, and verification standards required to achieve an exact 1-to-1 visual and layout replica of `interactive-prototype-v2.html`.

### 1.2 Core Architectural Principles
- 1:1 Visual Parity: Every screen must strictly mirror the colors, gradients, card structures, borders, typography, avatars, badges, and layout spacing of `interactive-prototype-v2.html`.
- Real Services Preservation: Feature screens remain pure presentational components receiving typed props. All SQLite database repositories, hooks, offline file storage, and sync services remain functional and authentic.
- Truthful Capability Reporting: Real captured photos route to `CaptureResultScreen` with explicit `Disease Diagnosis: No Model Weights` disclosures. No synthetic diagnosis or invented percentage is presented as real inference output.
- Demo Test Pathway: In accordance with the prototype flow (Screen 3 to Screen 4), `CaptureResultScreen` provides an explicit `[Demo Test] View Illustrative Sample Screen` button that displays the prototype's illustrative Anthracnose diagnosis in `ResultScreen` clearly marked with sample disclaimers.
- Dual Language Fidelity: All titles, subtitles, helper notes, and button labels must support English and Filipino with strings in `app/src/ui/i18n/`.
- Accessibility and Platform Standards: All interactive elements maintain a minimum 48dp touch target, WCAG 2.2 AA compliant contrast, Android TalkBack accessibility labels, and responsive layout behavior across web (compact 395px centered shell) and native Android.

---

## 2. Shared Prototype UI Primitives (`app/src/ui/`)

To eliminate visual discrepancies and avoid repetitive inline styling, the application introduces a unified suite of prototype-matching UI components in `app/src/ui/components/prototype/` and exposes them via `app/src/ui/index.ts`.

### 2.1 Color and Gradient Tokens
- Primary Forest Gradient: `linear-gradient(135deg, #154d2e 0%, #0b2b19 100%)`
  - In React Native, implemented via `expo-linear-gradient` (`colors={['#154d2e', '#0b2b19']}`, `start={{ x: 0, y: 0 }}`, `end={{ x: 1, y: 1 }}`).
- Primary Orange Gradient: `linear-gradient(135deg, #c2410c 0%, #ea580c 100%)`
  - In React Native, implemented via `expo-linear-gradient` (`colors={['#c2410c', '#ea580c']}`).
- App Background: `#f2f6f3`
- Card Surface: `#ffffff` with border `1px solid rgba(21, 77, 46, 0.14)` and shadow `0 4px 16px rgba(15, 35, 22, 0.06)`
- Text Primary: `#0f1d14`
- Text Muted: `#3f5246`
- Text Subtle: `#4f6356`
- Status Colors:
  - Healthy: Text `#166534`, Surface `#dcfce7`
  - Warning: Text `#92400e`, Surface `#fef3c7`
  - Severe / Error: Text `#b91c1c`, Surface `#fee2e2`
  - Info: Text `#0369a1`, Surface `#e0f2fe`

### 2.2 Primitive Components

#### `GreenTopCell`
- Description: The signature green top banner featured on almost every screen in the prototype.
- Props:
  - `title`: string
  - `subtitle`?: string
  - `badge`?: { label: string; variant?: 'offline' | 'info' | 'healthy' | 'sample' }
  - `leftAction`?: { icon: 'menu' | 'back' | 'close'; onPress: () => void; label: string }
  - `rightAction`?: { label: string; icon?: string; onPress: () => void }
  - `headerIcon`?: string (large emoji or icon, e.g. `🍊` or `📬`)
  - `centered`?: boolean
- Visual Specifications:
  - Background: Primary Forest Gradient (`#154d2e` to `#0b2b19`).
  - Border radius: Bottom corners rounded to 20px (or flat inside full shells).
  - Padding: Horizontal 16px, Top 16px (plus safe area inset), Bottom 18px.
  - Title: Plus Jakarta Sans Bold, 1.25rem to 1.35rem, color `#ffffff`.
  - Subtitle: Plus Jakarta Sans Medium, 0.75rem to 0.8rem, color `#d1fae5`.

#### `FrostedCard`
- Description: High-contrast white card container used for grouping content.
- Props:
  - `children`: React.ReactNode
  - `accentBorder`?: 'none' | 'forest' | 'orange' | 'amber' | 'healthy' | 'info' | 'severe' | 'dashed-orange'
  - `surfaceColor`?: string (defaults to `#ffffff`, or light tints such as `#f0fdf4` or `#fffbeb`)
  - `onPress`?: () => void
  - `style`?: ViewStyle
- Visual Specifications:
  - Background: `#ffffff` (or configured tint).
  - Border: 1px solid `rgba(21, 77, 46, 0.14)`.
  - Border Radius: 16px to 18px.
  - Shadow: Offset { width: 0, height: 4 }, opacity 0.06, radius 16, elevation 2.
  - Accent Left Border: When specified, a 4px solid left border in the designated status color (e.g. 4px `#154d2e`, `#166534`, `#c2410c`, or `#0369a1`).
  - Dashed Accent: For illustrative notices, `1.5px dashed #c2410c`.
  - Padding: 12px to 16px.

#### Button Suite
- `BtnOrangeFull`:
  - Background: Orange Gradient (`#c2410c` to `#ea580c`).
  - Height: Minimum 44px.
  - Border Radius: 14px.
  - Text: Plus Jakarta Sans ExtraBold, color `#ffffff`, font size 0.85rem.
  - Shadow: 0 4px 12px `rgba(194, 65, 12, 0.35)`.
- `BtnForestFull`:
  - Background: `#154d2e`.
  - Height: Minimum 44px.
  - Border Radius: 14px.
  - Text: Plus Jakarta Sans Bold, color `#ffffff`, font size 0.85rem.
- `BtnOutline`:
  - Background: Transparent or white.
  - Border: 1.5px solid `rgba(21, 77, 46, 0.25)`.
  - Height: Minimum 44px.
  - Border Radius: 14px.
  - Text: Plus Jakarta Sans Bold, color `#154d2e`, font size 0.82rem.
- `BtnSubtle`:
  - Background: Transparent or subtle light tint (`#eaf4ed` or `rgba(255,255,255,0.15)`).
  - Text: Plus Jakarta Sans SemiBold, font size 0.75rem to 0.8rem.

#### `StatusBadge`
- Variants:
  - `badge-healthy`: Background `#dcfce7`, text `#166534`.
  - `badge-warning`: Background `#fef3c7`, text `#92400e`.
  - `badge-offline`: Background `#eaf4ed` (or `#154d2e` when on dark), text `#154d2e` (or `#ffffff`).
  - `badge-sample`: Background `#fef3c7`, text `#92400e`, border `1px dashed #c2410c`.
  - `badge-info`: Background `#e0f2fe`, text `#0369a1`.
- Sizing: Height 22px, border radius 999px, padding horizontal 8px, font size 0.68rem to 0.72rem, font weight 700.

#### `CropCircleAvatar`
- Avatar sizes: 38px, 44px, or 48px.
- Background: Tinted round surface (`#eaf4ed`, `#fef3c7`, or `#dcfce7`).
- Content: Fruit emoji (`🥭` Mango, `🍌` Banana, `🍈` Papaya, `🍊` General/Welcome).

---

## 3. Screen-by-Screen 1:1 Implementation Specifications

### Screen 1: Home Dashboard (`HomeScreen.tsx`)
- Container: Screen scroll body with `#f2f6f3` background.
- Top Header (`GreenTopCell`):
  - Badge: `badge-offline` showing `Lokal na Offline` / `Local Offline Mode`.
  - Title: `Magandang araw!` / `Good day!`.
  - Subtitle: `Handang tumulong sa iyong pananim` / `Decision-support for your fruit crops`.
- Primary Action Card (`FrostedCard` with subtle orange border `1.5px solid rgba(194, 65, 12, 0.25)`):
  - Header Row: 48px orange gradient circle with camera SVG icon, title `Take or Choose Photo` (`Kumuha o Pumili ng Litrato`), subtitle `Stored on your device. Works fully without internet.` (`Ligtas na naka-imbak sa telepono. Hindi kailangan ng internet.`).
  - Button Grid (2-column): `Camera` (`BtnOrangeFull`) and `Pick from Gallery` (`BtnOutline`).
- Recent Activity Card (`FrostedCard`):
  - Header Row: Title `Recent Activity` (`Kamakailang Tala (Recent Activity)`) with subtle link `View History` (`Tingnan Lahat ->`).
  - Item 1 (Active Monitoring): Container with `#f8faf9` background, border `1px solid var(--card-border)`, 12px radius, 38px pale green avatar (`🥭`), title (e.g. `Mangga Carabao #042`), `Day 10 Scheduled` warning badge, subtitle `Observation: Record current condition`, right chevron. If no session exists, render an empty invitation prompt.
  - Item 2 (Latest Scan): Container with white background, border `1px solid var(--card-border)`, 12px radius, 38px soft amber avatar (`🥭`), localized crop name, `Local` badge, finding text, timestamp, right arrow. If no scan exists, render an empty capture invitation.
- Supported Crops Section:
  - Header Row: Title `Crop Profiles & Guidance` (`Mga Gabay sa Pananim`) with subtle link `Encyclopedia ->`.
  - 3-Column Grid (`fruit-cards-grid`):
    - Mango: Card with 48px circular avatar (`🥭`), title `Mangga` / `Mango`, subtitle `Carabao, Pico`.
    - Banana: Card with 48px circular avatar (`🍌`), title `Saging` / `Banana`, subtitle `Lakatan, Saba`.
    - Papaya: Card with 48px circular avatar (`🍈`), title `Papaya` / `Papaya`, subtitle `Red Lady, Solo`.
    - Interaction: Tapping any card navigates to `varietyInfo` with the selected crop active.
- Climate Snapshot Card (`FrostedCard` with 4px blue left border):
  - Header Row: Pin icon with location name (e.g. `📍 Davao City`), and `Climate Normals` info badge.
  - Content Row: Large temperature readout `29°C`, subtitle `Cached • Suitable for Mango flowering`, weather icon `🌤️`.
  - Interaction: Tapping opens `climate` screen.

### Screen 2: Camera Viewfinder (`CaptureScreen.tsx`, `CameraCapture.tsx`)
- Container: Full-height dark frame `#0c140e` with 24px rounded corners.
- Top Controls Bar:
  - Left: 44px circular button (`✕`), background `rgba(0,0,0,0.65)`, border `1px solid rgba(255,255,255,0.2)`.
  - Center: Pill badge `🔒 On-Device Only` (`🔒 Lokal na Device Lamang`), background `rgba(0,0,0,0.6)`.
  - Right: 44px circular flash toggle button (`⚡`).
- Target Reticle Frame:
  - Dimensions: Inset 16% from top, 8% from horizontal edges, 24% from bottom.
  - Border: `2.5px dashed rgba(74, 222, 128, 0.85)`, border radius 24px, inner glow shadow.
  - Text overlay: Bold white heading `Center the fruit within the frame`, subtitle `Ensure natural lighting and steady focus on lesions`.
- Bottom Shutter Bar:
  - Left: 48px circular gallery button (`🖼️`), translucent background.
  - Center: 76px shutter button with white ring and 60px orange gradient center FAB with drop shadow.
  - Right: 48px circular camera flip button (`🔄`).

### Screen 3: Scan Detection Result (`CaptureResultScreen.tsx`)
- Header (`GreenTopCell`): Title `Scan Detection Result` (`Resulta ng Pag-scan`), subtitle `On-device fruit evaluation`, top-right `Retake` (`Kumuha Ulit`) pill button.
- Auto-Detected Fruit Card (`FrostedCard` with 4px green left border, `#f0fdf4` surface):
  - 48px circular avatar in `#dcfce7` with crop emoji.
  - Header: uppercase label `Auto-Detected Fruit Crop` and `96% Match` healthy badge.
  - Title: localized crop name (e.g. `Mangga (Carabao)`).
  - Subtitle: italicized botanical name (`Mangifera indica`) and morphology detection explanation.
- Truthful Degradation Card (`FrostedCard` with 4px amber left border):
  - Alert triangle icon, bold heading `Disease Diagnosis: No Model Weights`.
  - Explanation: Discloses that the photo is securely saved in the device SQLite database and no speculative disease percentages are fabricated in this thesis development phase.
- Stored Photo Card (`FrostedCard`):
  - Dark container `#16241a`, 150px height, 12px border radius.
  - Preview photo or centered emoji, text `Photo retained in local SQLite repository`, record ID (e.g. `✓ Record ID: SCAN-2026-0043`), and coarse geo-tag.
- Action Pathways:
  - `Browse Local Crop Knowledge` (`BtnForestFull`) navigating to `varietyInfo`.
  - `Start Manual Monitoring Session` (`BtnOutline`) navigating to `monitoringList`.
  - `[Demo Test] View Illustrative Sample Screen` (`BtnSubtle`, orange text) navigating to `result`.

### Screen 4: Illustrative Sample Diagnosis (`ResultScreen.tsx`)
- Top Illustrative Notice (`FrostedCard` with `1.5px dashed #c2410c` border, `#fffbeb` surface):
  - Badge: `Illustrative Sample Scenario` (`badge-sample`).
  - Text: Discloses that data is for thesis demonstration only and does not constitute automated or professional diagnosis.
- Top Result Banner:
  - Deep forest green container, 18px radius, 38px crop emoji (`🥭`), title `Mangga (Carabao)`, subtitle `Auto-Detected Crop (96% Match)`, and `Demo` badge.
- Possible Finding Card (`FrostedCard`):
  - Uppercase label `Tentative Indication`, `Moderate` warning badge.
  - Title: `Anthracnose (Colletotrichum gloeosporioides)` with fungal peel spot description.
- Severity Evaluation Card (`FrostedCard`):
  - Uppercase label `Estimated Lesion Area Ratio`, large bold text `28.5% • KATAMTAMAN (MODERATE)`, surface ratio caption.
  - Gauge: 50px circular ring with `3.5px solid #c2410c` border and centered `28%` text.
- Agronomic Guidance Card (`FrostedCard` with pale green `#f0fdf4` surface and `#bbf7d0` border):
  - Title: `🌱 Agronomic Guidance (Decision-Support)` with `BPI Technical Notes` healthy badge.
  - 3 Categorized Guidance Bullets:
    - Sanitation: Prune infected canopy twigs and bury fallen fruit.
    - Precaution: Do not consume or sell severely rotting harvested fruits.
    - Referral: Verify fungicide treatments with local agricultural extension worker.
- Primary CTA: `Start Monitoring Session` (`BtnOrangeFull`) with arrow icon.

### Screen 5: Monitoring Sessions List (`MonitoringListScreen.tsx`)
- Header (`GreenTopCell`): Title `Crop Monitoring` (`Mga Pagsubaybay (Monitoring)`), subtitle `Track crop condition across Day 1, 5, and 10`, top-right `+ New` (`+ Bago`) pill button.
- Filter Chips Bar: Horizontal pill scroll with `All (Lahat)`, `Active (Aktibo)`, and `Completed (Tapos Na)`.
- Sessions List:
  - List of `FrostedCard` containers with 44px crop emoji avatar in pale green `#eaf4ed`, session title (e.g. `Carabao Mango #042`), status badge (`badge-warning` for Active, `badge-healthy` for Completed), issue description, start date, and right arrow chevron.
  - Empty state: Clean card explaining the monitoring workflow with an action to start tracking from a recent scan.
- Bottom Action: `Start from New Photo` (`BtnForestFull`) with camera icon.

### Screen 6: Observation Checkpoint (`MonitoringScreen.tsx`)
- Header (`GreenTopCell`): Title `Record Observation` (`Pagtatala ng Obserbasyon`), crop checkpoint subtitle (e.g. `Mangga Carabao #042 • Day 10 Checkpoint`), top-right `← Back` action.
- Timeline Progress Card (`FrostedCard`):
  - Checkpoint labels: `Day 1 (Baseline)`, `Day 5`, `Day 10 (Today)` in bold orange.
  - Progress Bar: 6px track `#e2e8f0` filled with `#154d2e` bar.
  - Timestamp caption: Actual recorded date string.
- Observation Grid Card (`FrostedCard`):
  - Form labels: `How has the fruit/lesion condition progressed?` and `Select based on your direct orchard inspection:`.
  - 2x2 Observation Grid (`observation-grid`):
    - `🌱 Better` (`Mas Mabuti`)
    - `⚖️ About Same` (`Kapareho Lang`)
    - `⚠️ Worse` (`Lumala`)
    - `❓ Unsure` (`Hindi Sigurado`)
    - Selected tile receives forest green border, pale green background, and bold text.
  - Field Notes: Textarea input for field observations with placeholder `E.g., Finished pruning canopy twigs...`.
  - Submit CTA: `Save Observation to SQLite` (`BtnForestFull`) with check icon.

### Screen 7: Scan History (`HistoryScreen.tsx`)
- Header (`GreenTopCell`): Title `Scan History` (`Kasaysayan ng mga Scan`), subtitle `Persisted locally on device SQLite`, top-right `← Home` action.
- Search Field: Input container with magnifying glass icon `🔍` and placeholder for fruits, diseases, and scan IDs.
- Filter Chips: Horizontal scroll with `All (3)`, `🥭 Mangga`, `🍌 Saging`, and `🍈 Papaya`.
- Records List:
  - List of `FrostedCard` items with 44px crop avatar in `#eaf4ed`, crop title, `Local` badge, finding summary, record ID, and date string.
  - Empty state: Clean card stating no scans match the criteria with a button to capture a new photo.

### Screen 8: Climate and Suitability (`ClimateScreen.tsx`)
- Header (`GreenTopCell`): Title `Climate & Suitability` (`Panahon & Kaangkupan`), coarse location label (e.g. `📍 Davao City, Region XI`), and top-right `Change` (`Palitan`) pill button.
- Suitability Card (`FrostedCard` with 4px green left border):
  - Crop emoji (`🥭`), title `Mango: Highly Suitable`, `Induction Season` healthy badge, and agronomic rationale based on temperature and rainfall.
- 3-Metric Climate Grid:
  - 3-column layout of `#f8faf9` rounded cards:
    - Humidity: `💧`, `78%`, label `Humidity` (`Halumigmig`).
    - Rainfall: `🌧️`, `1.4 mm`, label `Rainfall` (`Ulan`).
    - Elevation: `⛰️`, `32 m`, label `Elevation` (`Taas ASL`).
- 12-Month Climate Normals Histogram (`FrostedCard`):
  - Title: `12-Month Rainfall Normals` with `1991–2020 Baseline` caption.
  - 12 vertical bars with graduated colors: light blue `#0284c7` for dry months, green `#166534` for moderate rain, deep forest `#154d2e` for heavy wet months.
  - Month labels: `Ene` through `Dis`.
- Action CTA: `← Back to Home` (`BtnForestFull`).

### Screen 9: Location Picker (`LocationPickerScreen.tsx`)
- Header (`GreenTopCell`): Title `Select Location` (`Pumili ng Lugar`), coarse location explanation subtitle, top-right `✕ Cancel` button.
- Input Card (`FrostedCard`):
  - City or municipality input field with current value.
  - Presets list:
    - Davao City: Marked with checkmark, pale green background, and `Current` healthy badge.
    - Tagum City, General Santos City, Cagayan de Oro: Clean selectable rows.
- Action CTA: `🛰️ Use Device GPS` (`BtnForestFull`) to acquire rounded GPS coordinates.

### Screen 10: Crop Encyclopedia (`VarietyInfoScreen.tsx`)
- Header (`GreenTopCell`): Crop title (e.g. `🥭 Carabao Mango`), botanical name (`Mangifera indica L.`), top-right `← Home` button.
- Crop Tabs: 3 segmented buttons (`🥭 Mango`, `🍌 Banana`, `🍈 Papaya`), with the active tab highlighted.
- Agronomic Thresholds Card (`FrostedCard`):
  - 2x2 grid of `#f8faf9` tiles: Temperature (`24°C – 32°C`), Annual Rainfall (`1,500 – 2,200 mm`), Elevation (`0 – 600m ASL`), Soil pH (`5.5 – 7.5`).
- Key Vulnerabilities Card (`FrostedCard`):
  - Red highlight containers (`#fef2f2` background, `#991b1b` text) detailing major crop diseases (such as Anthracnose and Stem End Rot).
- Action CTA: `Scan this Crop` (`BtnOrangeFull`) with camera icon.

### Screen 11: Bilingual Agro-Assistant (`ChatScreen.tsx`)
- Header (`GreenTopCell`): Left `☰` drawer button, active chat title, `Curated Offline Knowledge` subtitle, top-right `+ New` pill button.
- Safety Disclaimer Banner: Soft blue bar `#e0f2fe` with shield icon `🛡️` and advisory text `Decision support only. Consult local agriculturist for chemical treatments.`.
- Slide-out History Drawer (`chat-drawer`):
  - Overlay drawer with header `🌾 Past Chats`, close button `✕`, `+ Start New Chat` button, `Recent Conversations` list with active selection highlight, and trash deletion buttons (`🗑️`).
- Transcript Messages List:
  - Bot messages: Left-aligned white frosted card with rounded corners (`14px 14px 14px 4px`), header `🌾 PrutasAI Bot` in forest green, and conversational body text.
  - User messages: Right-aligned forest green bubble with rounded corners (`14px 14px 4px 14px`) and white text.
- Composer Input Bar:
  - Rounded text input (`min-height: 44px`, placeholder `Ask crop question...`) and a 44px orange gradient send button (`➔`).

### Screen 12: Combined Account and Settings (`AccountScreen.tsx`)
- Header (`GreenTopCell`): Title `Account & Settings` (`Account at Mga Setting`), subtitle `Offline storage, language & optional sync`, right gear icon `⚙️`.
- Profile Card (`FrostedCard`):
  - 48px circle avatar (`👨‍🌾` if logged in, `👤` if guest), name or `Guest Farmer`, operating status subtitle.
  - Guest mode: Dual action buttons `Log In` (`BtnOutline`) and `Create Account` (`BtnForestFull`).
  - Authenticated mode: Subtle red link `Sign Out (Photos remain on device)`.
- Cloud Sync Preferences Card (`FrostedCard`):
  - Title `☁️ Cloud Synchronization (Optional)`, privacy disclosure explaining that photos stay on device while lightweight metadata syncs when online.
  - Dual options: `🔒 Local Offline Only` (`BtnForestFull`) and `☁️ Sync Metadata` (`BtnOutline`).
- App Preferences Links Card (`FrostedCard`):
  - Language row: Title `Language`, current setting, badge `🇵🇭 FIL` / `🇺🇸 EN`.
  - Crop Location row: Title `Crop Location`, current location string, chevron.
  - AI Model Registry row: Title `AI Model Registry`, status `Offline` badge.
  - Trash row: Title `🗑️ Trash (15-Day Retention)`, trashed conversation count, chevron, styled with red text `#dc2626`.

### Screen 13: Log In (`LoginScreen.tsx`)
- Header (`GreenTopCell`): Title `Log In`, metadata sync subtitle, top-right `✕ Cancel` button.
- Form Card (`FrostedCard`):
  - Email field with helper text.
  - Password field with `Forgot password?` link and `👁️ Show / Hide` toggle.
  - Submit CTA: `Log In` (`BtnForestFull`).
- Navigation Links: `Don’t have an account? Create one` (forest link) and `🔒 Continue Offline (No Account)` (muted subtle button).

### Screen 14: Create Account (`SignUpScreen.tsx`)
- Header (`GreenTopCell`): Title `Create Account`, offline reassurance subtitle, top-right `✕ Cancel` button.
- Form Card (`FrostedCard`):
  - Email field with confirmation link helper text.
  - Password field with Show/Hide toggle and 8-character minimum helper text.
  - Confirm Password field with Show/Hide toggle.
  - Data Privacy Box: Pale green container `#f0fdf4` with lock icon and text `Data Privacy: All fruit capture photographs remain strictly on this device.`.
  - Submit CTA: `Create Account` (`BtnOrangeFull`).
- Navigation Links: `Already have an account? Log In` and `Continue Offline`.

### Screen 15: Email Confirmation Pending (`EmailConfirmationScreen.tsx`)
- Header (`GreenTopCell`): Centered `📬` icon, Title `Check Your Email`, subtitle `A verification link has been sent`.
- Detail Card (`FrostedCard`):
  - Registered address displayed inside a pale green highlight box (`#f0fdf4`).
  - Instructions reassuring that offline features remain available.
- Actions: `🔄 Resend Email` (`BtnForestFull`), `Back to Log In` (`BtnOutline`), and `🔒 Continue Using Offline` (`BtnSubtle`).

### Screen 16: Forgot Password (`ForgotPasswordScreen.tsx`)
- Header (`GreenTopCell`): Title `Reset Password`, recovery explanation subtitle, top-right `✕ Cancel` button.
- Form Card (`FrostedCard`):
  - Registered email input with neutral non-enumeration helper text (`If an account exists for this address, you will receive recovery instructions.`).
  - Submit CTA: `Send Reset Link` (`BtnForestFull`).
- Navigation Link: `← Back to Log In`.

### Screen 17: AI Model Registry (`ModelStatusScreen.tsx`, `ModelStatusView.tsx`)
- Header (`GreenTopCell`): Title `AI Model Registry`, pipeline health subtitle, top-right `← Back` action.
- Disclosure Card (`FrostedCard` with 4px amber left border):
  - Amber header `Thesis Phase Disclosure` and text disclosing that no model weights are bundled and offline flows degrade truthfully to local decision-support.
- Pipeline Stages Card (`FrostedCard`):
  - Title `Pipeline Stages`.
  - Stage 1: Fruit Detector (YOLO) with `No Weights` badge.
  - Stage 2: Variety Classifier with `No Weights` badge.
  - Stage 3: Disease & Lesion Segmentation with `No Weights` badge.
- Action CTA: `← Back to Account & Settings` (`BtnForestFull`).

### Screen 18: Trash Manager (`TrashScreen.tsx`)
- Header (`GreenTopCell`): Title `Trash Manager`, 15-day retention subtitle, top-right `← Back` action.
- Notice Card (`FrostedCard` with `#fff5f5` surface and `#fecaca` border):
  - Text explaining that chat conversations support 15-day soft delete, whereas photo captures are purged immediately when deleted.
- Trashed List:
  - List of trashed chats with title, deletion date in red, and `Restore` button (`#eaf4ed` background, forest green text).
  - Empty state when 0 items: `Trash is empty` (`Walang laman ang basurahan.`).
- Action CTA: `← Back to Account` (`BtnForestFull`).

### Screen 19: Welcome and Onboarding (`WelcomeScreen.tsx`)
- Header (`GreenTopCell`): 52px orange circular icon `🍊`, Title `Maligayang Pagdating sa PrutasAI`, crop scope subtitle.
- Language Selector Card (`FrostedCard`):
  - Row with `Select Language` and `🇵🇭 FIL` / `🇺🇸 EN` toggle buttons.
- Path 1 Card (`FrostedCard` with 2px forest green border):
  - Lock icon `🔒`, Title `Continue Fully Offline (Recommended)`, explanation that no registration or internet is needed.
- Path 2 Card (`FrostedCard`):
  - Cloud icon `☁️`, Title `Create Account (Optional Sync)`, explanation of checkpoint sync across devices.
- Footer Link: `Already have an account? Log In`.

---

## 4. Global Navigation and Viewport Chrome

### 4.1 Floating Bottom Navigation Bar (`BottomNav.tsx`)
- Container: Floating white pill wrapper with `borderRadius: 36`, border `1px solid rgba(21, 77, 46, 0.12)`, shadow `0 8px 24px rgba(15, 35, 22, 0.12)`, height 64px, inset from screen bottom by safe area.
- 4 Tab Items:
  - Home: Outline home icon, label `Home`.
  - Monitoring: Pulse/activity graph icon, label `Monitoring`.
  - Assistant: Chat bubble icon, label `Assistant` (`Gabay`).
  - Account: User profile icon, label `Account`.
  - Selected State: Forest green icon and text (`#154d2e`), bold weight, tinted icon background pill (`#eaf4ed`).
- Center Scan FAB:
  - Elevated 52px circular button with primary orange gradient (`#c2410c` to `#ea580c`), white camera icon, and 3px solid white border, visually raised above the pill bar.
  - Pressing triggers the camera capture flow without altering the persistent tab index.

### 4.2 Compact Web Shell (`AppViewport.tsx`)
- Web Viewport: Centered container with `maxWidth: 395`, `width: 100%`, occupying full vertical height, without decorative desktop frames or artificial bezels.
- Android Viewport: 100% available width and height, respecting system status bar and navigation bar safe area insets.

---

## 5. Bilingual String Dictionary Coverage

Every new text string from `interactive-prototype-v2.html` must be added to both `app/src/ui/i18n/en.json` and `fil.json`:
- `prototypeLocalOffline`: "Local Offline Mode" / "Lokal na Offline"
- `prototypeGreeting`: "Good day!" / "Magandang araw!"
- `prototypeTagline`: "Decision-support for your fruit crops" / "Handang tumulong sa iyong pananim"
- `prototypeTakeChoosePhoto`: "Take or Choose Photo" / "Kumuha o Pumili ng Litrato"
- `prototypePhotoStorageBlurb`: "Stored on your device. Works fully without internet." / "Ligtas na naka-imbak sa telepono. Hindi kailangan ng internet."
- `prototypeCameraAction`: "Camera" / "Kumuha (Camera)"
- `prototypeGalleryAction`: "Pick from Gallery" / "Gallery / File"
- `prototypeObservationPrompt`: "How has the fruit/lesion condition progressed?" / "Kumusta ang kalagayan ng prutas/sugat ngayon?"
- `prototypeObservationSub`: "Select based on your direct orchard inspection:" / "Pumili base sa iyong sariling pagmamasid sa taniman:"
- `prototypeObsBetter`: "Better" / "Mas Mabuti"
- `prototypeObsSame`: "About Same" / "Kapareho Lang"
- `prototypeObsWorse`: "Worse" / "Lumala"
- `prototypeObsUnsure`: "Unsure" / "Hindi Sigurado"
- `prototypeDemoTestButton`: "[Demo Test] View Illustrative Sample Screen" / "[Demo Test] Tingnan ang Halimbawang Resulta"
- `prototypeIllustrativeNotice`: "Data below is for thesis demonstration only. This is not an automated or professional diagnosis." / "Ang datos sa ibaba ay demonstrasyon lamang para sa pagsusuri ng UI. Hindi ito opisyal na diagnosis ng eksperto."

---

## 6. Verification and Acceptance Criteria

### 6.1 Static Type Safety
- `npm --prefix app run typecheck` passes with zero errors across all components and screens.

### 6.2 Test Suites
- Unit and snapshot tests in `app/src/features/__tests__/` verify rendering of all 19 screens with the new prototype components.
- Navigation tests verify tab switching, modal routes, back handling, and the demo test button routing.

### 6.3 Visual and Accessibility Verification
- 1:1 visual match against `interactive-prototype-v2.html` rendered side-by-side.
- All touch targets meet or exceed 48dp by 48dp.
- Text contrast ratios exceed WCAG 2.2 AA requirements (minimum 4.5:1 against surfaces).
- Safe area insets properly applied on both Android and web.
