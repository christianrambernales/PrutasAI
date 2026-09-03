# PrutasAI 🍊

**An Offline-First Fruit Variety and Disease Identification System with Explainable AI, Severity Classification, and Agronomic Advisory**

> Bachelor of Science in Computer Science — Intelligent Systems Track  
> College of Science and Computer Studies | Computer Science Department  
> De La Salle University - Dasmariñas (May 2025)

---

## Overview

**PrutasAI** is an offline-first, mobile decision-support system engineered for Filipino farmers, agricultural extension workers, researchers, and fruit cultivators. Designed to operate reliably in rural agricultural settings with limited or zero internet connectivity, PrutasAI combines edge computer vision, explainable artificial intelligence, local SQLite persistence, climate analytics, and a grounded conversational assistant into a unified, privacy-conscious Android application.

Key system capabilities include:

- **Fruit Classification (Stage 1)** — Fast, on-device bounding-box localization and classification of fruit targets using a lightweight YOLOv11n architecture.
- **Philippine Variety Identification (Stage 2)** — Distinguishes commercially significant Philippine cultivars (e.g., *Lakatan*, *Latundan*, *Saba*, and *Cavendish* bananas; *Carabao*, *Pico*, and *Katchamita* mangoes; *Solo*, *Cavite Special*, *Red Lady*, and *Sinta* papayas) via dedicated crop-specific classification heads.
- **Disease & Pathology Detection (Stage 3)** — Identifies major fruit and foliage diseases (Anthracnose, Powdery Mildew, Rust, Scab, Blight) across leaf and fruit surfaces.
- **Awareness-Only Safety Conditions** — Detects irreversible post-harvest conditions (Mold, Rot) and immediately triggers actionable isolation/disposal advisories without running unnecessary processing stages.
- **Scale-Invariant Severity Classification** — Measures disease severity by computing lesion area relative to the Stage-1 fruit bounding box ($Area_{\text{lesion}} / Area_{\text{fruit}}$), eliminating distortion caused by varying camera distances, and categorizing infections into **Early** (<15%), **Moderate** (15–40%), or **Severe** (>40%).
- **Explainable AI (XAI)** — Provides visual transparency on model inference using forward-pass **Eigen-CAM** on-device for mobile runtime, paired with gradient-weighted **Grad-CAM** for offline research validation and figure generation.
- **Agriculturist-Validated Remedies** — Delivers severity-calibrated, step-by-step treatment protocols, application timing, dosage guidance, and cultural prevention measures.
- **Climate & Agronomic Suitability Engine** — Integrates Open-Meteo data to evaluate local conditions against 5-year historical monthly normals (temperature, rainfall, elevation) rather than transient weather, calculating grounded planting suitability verdicts.
- **Dual-Tier Agricultural Assistant** — Features a 100% deterministic, offline intent-matching engine over curated agricultural records, complemented by an online Gemini fallback chain via a secure Vercel API proxy. Output guards strictly reject any response that alters computed verdicts or fabricates numerical claims.
- **10-Day Progression & Recovery Monitoring** — Guides cultivators through Day 1 → Day 5 → Day 10 monitoring checkpoints, calculating severity deltas and detecting infection dominance shifts over time.
- **Bilingual Interface** — Complete native localization across all screens, remedies, advisories, and knowledge-base entries in both **English** and **Filipino (Tagalog)**.
- **Privacy-Centric & Optional Cloud Sync** — Operates entirely anonymously without mandatory authentication; coarse location is rounded to 2 decimal places (~1.1 km). Scans and chat threads can optionally sync to a Supabase cloud repository guarded by Row Level Security (RLS).

---

## Supported Fruits & Varieties

The application focuses on three major Philippine commercial fruit crops: **Banana**, **Mango**, and **Papaya**. The system structures cultivars into **Machine Learning Classes** (trained for exterior visual identification) and **Informational Strains** (clonal selections and regional strains documented in the knowledge base without separate visual classifier heads):

| Fruit Crop | Emoji | Key | ML Variety Classes (Stage 2) | Informational / Clonal Strains | Primary Agricultural Source |
|------------|:-----:|:---:|------------------------------|--------------------------------|-----------------------------|
| **Banana** (*Musa acuminata / balbisiana*) | 🍌 | `banana` | **Lakatan**, **Latundan**, **Saba**, **Cavendish** | — | PCAARRD-DOST Banana ISP |
| **Mango** (*Mangifera indica*) | 🥭 | `mango` | **Carabao**, **Pico**, **Katchamita** *(Indian)* | MMSU Gold, Sweet Elena (Carabao clonal strains) | PCAARRD-DOST Mango ISP; DA-BAR |
| **Papaya** (*Carica papaya*) | 🫒 | `papaya` | **Solo**, **Cavite Special**, **Red Lady**, **Sinta** | — | UPLB Institute of Plant Breeding |

---

## Disease & Pathology Scope

PrutasAI implements a dual-surface pathology matrix across the three supported fruit crops, distinguishing between full-pipeline detectable diseases and awareness-only conditions:

| Pathology Condition | Affected Surface | Banana | Mango | Papaya | Pipeline Action |
|---------------------|:----------------:|:------:|:-----:|:------:|:----------------|
| **Anthracnose** (*Colletotrichum spp.*) | Leaf + Fruit | ✅ | ✅ | ✅ | Full severity grading, remedies & monitoring |
| **Powdery Mildew** (*Oidium spp.*) | Leaf | — | ✅ | ✅ | Full severity grading, remedies & monitoring |
| **Rust** (*Puccinia / Uromyces spp.*) | Leaf | ✅ | — | ✅ | Full severity grading, remedies & monitoring |
| **Scab** (*Elsinoë spp.*) | Fruit | — | ✅ | ✅ | Full severity grading, remedies & monitoring |
| **Blight** (*Phytophthora / Cercospora spp.*) | Leaf | ✅ | ✅ | ✅ | Full severity grading, remedies & monitoring |
| **Mold** | Fruit only | ⚠️ | ⚠️ | ⚠️ | Awareness banner: isolate / dispose crop |
| **Rot** | Fruit only | ⚠️ | ⚠️ | ⚠️ | Awareness banner: isolate / dispose crop |

---

## Project Structure

```
PrustasAI/
├── README.md                           # Master project documentation
├── package.json                        # Monorepo root scripts & test runners
├── vercel.json                         # Vercel configuration with Cross-Origin headers
│
├── app/                                # Mobile Client (React Native / Expo SDK 54)
│   ├── app.json                        # Expo app manifest & native permissions
│   ├── eas.json                        # EAS build profiles (APK preview & production)
│   ├── package.json                    # Mobile client dependencies & scripts
│   ├── tsconfig.json                   # TypeScript configuration
│   ├── metro.config.js                 # Metro bundler with COI & SQL transformers
│   ├── assets/                         # Application icons, splash screens & assets
│   │   └── models/                     # Auto-synced TFLite model weights (gitignored)
│   ├── patches/                        # Vendor patches (patch-package)
│   └── src/
│       ├── App.tsx                     # App entry component
│       ├── navigation/                 # Navigation state reducer & renderers
│       │   ├── AppNavigator.tsx        # Master navigation coordinator
│       │   ├── navState.ts             # Pure state reducer for tabs & stack routes
│       │   ├── shell.ts                # Navigation contracts & interfaces
│       │   └── render/                 # Modular tab, route, and onboarding views
│       ├── core/                       # Core business logic, storage & drivers
│       │   ├── auth/                   # Supabase authentication & session restore
│       │   ├── chat/                   # Grounded intent matching, router & proxy
│       │   ├── climate/                # Open-Meteo client, cache & suitability logic
│       │   ├── db/                     # SQLite connection, migrations, seed & repos
│       │   │   ├── appDatabase.ts      # Multiplatform SQLite database opener
│       │   │   ├── migrations/         # Numbered SQLite DDL migrations
│       │   │   ├── repositories/       # Scans, conversations, content & settings
│       │   │   └── seed.sql            # Compiled agronomic content seed
│       │   ├── geo/                    # Province & municipality coordinates catalog
│       │   ├── ml/                     # TFLite model registry & degradation ladder
│       │   ├── severity/               # Scale-invariant severity calculation
│       │   ├── status/                 # Unified system capability & health state
│       │   └── sync/                   # Sync queue, background drain & trash purge
│       ├── features/                   # Screen-level presentation components
│       │   ├── account/                # User login, registration & cloud sync state
│       │   ├── capture/                # Camera preview, distance guide & picker
│       │   ├── chat/                   # Conversation threads, message list & sidebar
│       │   ├── climate/                # Weather cards, normals & suitability views
│       │   ├── history/                # Paginated scan records & filter controls
│       │   ├── home/                   # Dashboard, crop selector & system status
│       │   ├── modelStatus/            # TFLite model checksums & inspection
│       │   ├── monitoring/             # Day 1-5-10 recovery checkpoint cards
│       │   ├── result/                 # Diagnosis report, severity meter & remedy
│       │   ├── settings/               # Language, location & storage toggles
│       │   ├── trash/                  # Soft-deleted chat recovery & purge
│       │   └── varietyInfo/            # Cultivar encyclopedia & source citations
│       └── ui/                         # Design system, theme tokens & i18n
│           ├── theme.ts                # Color palette, spacing & typography
│           ├── tokens.ts               # Atomic design tokens
│           ├── components/             # Buttons, cards, modals & status badges
│           └── i18n/                   # English & Filipino strings dictionary
│
├── api/                                # Cloud Serverless Backend (Vercel Functions)
│   ├── package.json                    # API dependencies (@vercel/node, Supabase)
│   ├── tsconfig.json                   # TypeScript config for serverless functions
│   ├── v1/                             # REST API endpoints
│   │   ├── health.ts                   # /api/v1/health — service status check
│   │   ├── scans.ts                    # /api/v1/scans — authenticated scan backup
│   │   ├── assistant.ts                # /api/v1/assistant — rate-limited Gemini proxy
│   │   ├── conversations.ts            # /api/v1/conversations — conversation sync
│   │   └── conversation-messages.ts    # /api/v1/conversation-messages — chat turns
│   └── _lib/                           # Serverless shared utilities & security
│       ├── gemini.ts                   # Upstream Google Gemini caller & model chain
│       ├── handlers/                   # Modular request processors & logic
│       ├── http.ts                     # HTTP responses, headers & IP extractors
│       ├── instructions.ts             # System prompts for general & rephrase tiers
│       ├── limits.ts                   # Token-bucket rate limiting definitions
│       ├── rateStore.ts                # Persistent Supabase rate-limit tracker
│       ├── supabase.ts                 # Service-role Supabase client wrapper
│       └── validate.ts                 # Payload validation schemas
│
├── knowledge/                          # Single Source of Truth (SSOT) Data
│   ├── taxonomy.yaml                   # Fruits, varieties, strains & ML indices
│   ├── crop-requirements.yaml          # Optimal & tolerated climate boundaries
│   ├── diseases.yaml                   # Symptoms, causes & biological details
│   ├── remedies.yaml                   # Severity-specific treatments & dosage
│   └── sources.yaml                    # Formal academic & institutional citations
│
├── ml/                                 # Machine Learning Utilities & Contracts
│   ├── classes.json                    # Compiled fruit & variety class mappings
│   ├── training/                       # YOLOv11 training notebooks & pipelines
│   ├── export/                         # TFLite INT8 quantization & export tools
│   └── xai/                            # PyTorch Grad-CAM reference implementation
│
├── models/                             # Trained TFLite Weights Staging Directory
│   ├── README.md                       # Model placement & checksum instructions
│   └── manifest.json                   # Versioned metadata, input shapes & SHA256
│
├── scripts/                            # Build, Sync & Verification Utilities
│   ├── compile-knowledge.mjs           # Compiles YAML into seed.sql, classes.json, types
│   ├── sync-models.mjs                 # Copies models/ to app bundle & builds require-map
│   └── start-web.mjs                   # Web development proxy with COOP/COEP headers
│
├── supabase/                           # Cloud Database Schemas (PostgreSQL)
│   └── migrations/                     # RLS policies, tables & indices for sync
│       ├── 0001_scan_and_rate_hit.sql
│       ├── 0002_scan_location.sql
│       ├── 0003_profile_and_owned_scans.sql
│       ├── 0004_conversations.sql
│       └── 0005_conversation_policy_hardening.sql
│
└── docs/                               # Project Architecture Specs & Guides
    ├── BUILDING.md                     # Native APK build instructions
    └── superpowers/specs/              # Architectural Decision Records & Specs
```

---

## Detection & Staged Inference Pipeline

PrutasAI runs a multi-stage, modular computer vision pipeline on-device. Each stage operates independently, enabling the application to gracefully degrade if specific weights are uninstalled or if image confidence falls below operating thresholds:

```
Captured Image ──> [ CVIP Preprocessing: Resize 640x640, Normalization, Distance Check ]
                           │
                           ▼
                 [ Stage 1: Fruit Detector (YOLO11n) ]
                           │
         ┌─────────────────┴─────────────────┐
     [ Identified ]                     [ Low Conf ]
         │                                   │
         ▼                                   ▼
 [ Crop Fruit Region ]              "Could not identify fruit —
         │                           please retake photo"
         ├───────────────────────────────────────────┐
         ▼                                           ▼
[ Stage 2: Variety Classifier ]            [ Stage 3: Disease Detector ]
  (Crop-specific YOLO11n-cls)                (YOLO11n Multi-surface)
         │                                           │
         ▼                                           ▼
  Cultivar Identified                        Disease Box & Class
                                                     │
                                                     ▼
                                      [ Scale-Invariant Severity ]
                                      (Lesion Area ÷ Fruit Box Area)
                                                     │
                                                     ▼
                                      [ Explainable AI Heatmap ]
                                      (On-device Eigen-CAM activation)
                                                     │
                                                     ▼
                                      [ Remedy & Advisory Synthesis ]
                                      (SQLite Knowledge Base Lookup)
```

### The Degradation Ladder

The system strictly adheres to the principle of **truthful reporting**—it never fabricates a prediction or falls back to an undocumented default guess:

| Available Models / State | Reported Application Result | Available Features |
|--------------------------|-----------------------------|---------------------|
| **No models installed** | *"Detection model not installed"* | Full encyclopedia browsing, climate suitability, deterministic assistant, and manual history |
| **Stage 1 only** | *"Banana — variety not determined"* | Fruit identified; disease and variety marked unanalyzed |
| **Stage 1 + Stage 2** | *"Banana → Lakatan — disease model not installed"* | Fruit and variety confirmed; disease model uninstalled |
| **Stage 1 + Stage 2 + Stage 3** | **Full Diagnostic Report** | Fruit, variety, disease, severity %, remedy, advisory, and monitoring schedule |
| **Stage 1 below threshold** | *"Could not identify a fruit — retake the photo"* | Guides user on optimal framing, lighting, and distance |

### Scale-Invariant Severity Scoring

Unlike naive approaches that divide lesion pixels by the full image resolution (causing severity to fluctuate wildly depending on how close the camera is held), PrutasAI computes severity relative to the Stage-1 fruit bounding box:

$$\text{Severity Percentage} = \min\left(100, \frac{\text{Area}(\text{Lesion Bounding Box})}{\text{Area}(\text{Fruit Bounding Box})} \times 100\right)$$

- **Early Infection**: $< 15.0\%$ of fruit surface affected
- **Moderate Infection**: $15.0\% - 40.0\%$ of fruit surface affected
- **Severe Infection**: $> 40.0\%$ of fruit surface affected
- **Undetermined**: Assigned when no Stage-1 fruit box exists to prevent misleading calculations against the background.

---

## Dual-Tier Grounded Assistant & Chatbot

PrutasAI features a specialized agricultural assistant designed to protect cultivators from model hallucinations:

```
User Query ──> [ Intent Extraction & Slot Filling ] (fruit, variety, location, date)
                         │
                         ▼
             [ Context Assembly from SQLite ] (crop requirements, normals, remedies)
                         │
                         ▼
             [ Deterministic Verdict Engine ] ──> Suitable / Unsuitable / Insufficient Data
                         │
           ┌─────────────┴─────────────┐
      [ Offline ]                 [ Online ]
           │                           │
           ▼                           ▼
[ Template Provider ]        [ Vercel API / Gemini Proxy ]
(Curated bilingual text)     (Natural language rephrasing)
           │                           │
           │                           ▼
           │                 [ Strict Output Guard ]
           │                 - Did the verdict change?
           │                 - Are unverified numbers introduced?
           │                           │
           │                  ┌────────┴────────┐
           │               [ Pass ]          [ Reject ]
           │                  │                 │
           ▼                  ▼                 ▼
     [ Display Grounded Answer in Bilingual Chat Interface ]
```

1. **Deterministic Intent Matcher**: Maps user inputs into predefined slots (`crop_suitability`, `fruit_info`, `variety_info`, `disease_info`, `remedy`, `climate_now`, `about_scan`).
2. **Deterministic Verdict Computation**: Evaluates Open-Meteo 5-year climate normals against agronomic crop requirements stored in the database.
3. **Strict Output Guards**: When online, requests are reworded by Google Gemini via the Vercel API proxy. If Gemini introduces any number not present in the ground-truth database facts, or modifies the verdict, the response is discarded and the curated template is served instead.

---

## Database Architecture

PrutasAI uses an offline-first **SQLite** schema on the mobile device, coupled with an optional **Supabase PostgreSQL** cloud schema for cross-device backup.

### Local SQLite Schema (`app/src/core/db/`)

#### Content Tables (Seeded from `knowledge/*.yaml`, read-only at runtime)
- `source` — Scholarly citations (`id`, `citation`, `url`, `retrieved_at`)
- `fruit` — Fruit taxonomy (`key`, `name_en`, `name_fil`, `emoji`, `ml_class_index`)
- `variety` — Cultivars & strains (`key`, `fruit_key`, `name_en`, `name_fil`, `ml_class_index`, `is_ml_class`, `parent_key`, `source_id`)
- `crop_requirement` — Temperature, rainfall, and elevation thresholds
- `disease` — Disease definitions, symptoms, and causes
- `fruit_disease` — Mapping table defining affected surfaces (`leaf`, `fruit`, `both`)
- `remedy` — Severity-specific remedies (`treatment`, `timing`, `dosage`, `prevention`)

#### User Tables (Mutable, preserved across updates)
- `scan` — Historical scans (`uuid`, `image_uri`, `fruit_key`, `variety_key`, `disease_key`, `severity`, `severity_pct`, `bbox_json`, `lat`, `lon`, `created_at`, `synced_at`)
- `conversation` — Assistant chat sessions (`uuid`, `title`, `device_id`, `created_at`, `updated_at`, `deleted_at`, `synced_at`)
- `conversation_message` — Chat turns (`uuid`, `conversation_id`, `role`, `text`, `verdict_json`, `created_at`, `synced_at`)
- `setting` — Key-value user configuration (`language`, `useLocation`, `savedLocation`, `aiAssistant`, `content_version`)
- `schema_version` — Version tracker for automated database migrations

### Cloud Schema (`supabase/migrations/`)
- `scans` — Cloud backup of scans with user isolation via Row Level Security (RLS)
- `conversations` — Synced chat threads with soft-delete support (`deleted_at`)
- `conversation_messages` — Synced chat turns linked to parent conversations
- `rate_hits` — Sliding-window rate limit counters tracked per client IP and device UUID

---

## Cloud Serverless API Specification

Deployed on **Vercel** (`api/v1/*`) to broker LLM requests and cloud synchronization securely without embedding secrets into distributed APKs:

### Endpoints

| Method | Route | Auth Required | Description | Rate Limit |
|--------|-------|:-------------:|-------------|:----------:|
| `GET` | `/api/v1/health` | No | Service health and uptime check | None |
| `POST` | `/api/v1/assistant` | No (Device-keyed) | Proxies natural-language rephrasing to Gemini with output safety checks | 10 req / min |
| `POST` | `/api/v1/scans` | Yes (Bearer JWT) | Backs up an anonymized scan record to the user's Supabase account | 30 req / min |
| `POST` | `/api/v1/conversations` | Yes (Bearer JWT) | Upserts, renames, or soft-deletes a conversation thread | 60 req / min |
| `POST` | `/api/v1/conversation-messages` | Yes (Bearer JWT) | Synchronizes message turns belonging to an owned conversation | 60 req / min |

---

## Getting Started

### Prerequisites

- **Node.js** v20.x or newer (developed and validated on Node 20 & Node 24)
- **npm** v10.x or newer
- **Android Device or Emulator** — with **Expo Go** (pinned to Expo SDK 54) or Android Studio for local APK builds
- **Python 3.10+** *(optional, for ML training or compilation scripts)*

---

### 1. Repository Setup

Clone the repository and install dependencies for all workspaces:

```bash
# Clone the repository
git clone https://github.com/christianrambernales/PrutasAI.git
cd PrutasAI

# Install monorepo dependencies
npm install

# Install mobile app dependencies
npm --prefix app install

# Install serverless API dependencies
npm --prefix api install
```

---

### 2. Environment Configuration

Create the mobile environment configuration file at `app/.env`:

```bash
# app/.env
EXPO_PUBLIC_API_URL=https://<your-deployment>.vercel.app/api
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

For the Vercel API backend (`api/`), configure the following environment secrets in Vercel or `.env.local`:

```bash
GEMINI_API_KEY=<your-google-gemini-api-key>
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
GEMINI_MODELS=gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.6-flash,gemini-2.5-flash
```

---

### 3. Running the Mobile Application

Execute the start script from the root directory. This automatically runs `npm run compile:knowledge` and `npm run sync:models` before launching Metro:

```bash
npm start
```

#### On Physical Android Device
1. Install **Expo Go** from Google Play (ensure it supports **Expo SDK 54**).
2. Connect your phone to the same local Wi-Fi network as your development computer.
3. Scan the terminal QR code using Expo Go.

#### On Android Emulator
Ensure an Android Virtual Device (AVD) is running via Android Studio, then press `a` in the terminal or run:
```bash
npm --prefix app run android
```

#### On Desktop Browser (Cross-Origin Isolated Preview)
> ⚠️ **Important:** Do not use `expo start --web` directly. In-browser SQLite runs in a Web Worker requiring `SharedArrayBuffer`, which requires Cross-Origin Isolation headers (`COOP`/`COEP`). Use the provided proxy server:

```bash
npm run start:web
# Or: npm --prefix app run web
```
Open the localhost proxy URL printed in the terminal.

---

### 4. Running Test Suites & Quality Verification

PrutasAI enforces comprehensive test coverage across script utilities, the mobile React Native client, and the serverless API:

```bash
# Run all test suites across the monorepo
npm test

# Run specific suite targets
npm run test:scripts   # Verifies knowledge compiler, model sync & checksums
npm run test:app       # 305+ Jest tests covering components, db, severity & routing
npm run test:api       # 58+ Vitest tests covering API handlers, auth & rate limits

# Run full TypeScript type verification
npm run typecheck
```

---

### 5. Building an Installable Android APK

To generate a standalone, sideloadable `.apk` file for physical testing without Expo Go:

```bash
# Clean prebuild and compile release APK via local Gradle
npm run build:apk
```

The compiled release binary is output to:
`app/android/app/build/outputs/apk/release/app-release.apk`

*(Refer to [docs/BUILDING.md](docs/BUILDING.md) for detailed prerequisites including Android SDK, NDK, and JDK 17 setup).*

---

## Technology Stack

| Domain | Technology / Library | Role & Purpose |
|--------|----------------------|----------------|
| **Mobile Runtime** | React Native 0.81, Expo SDK 54 | Cross-platform mobile development runtime |
| **Language** | TypeScript 5.9 | Static typing and end-to-end contracts |
| **Local Persistence** | `expo-sqlite` (SQLite 3), `better-sqlite3` (tests) | On-device relational database for scans, chats, and knowledge |
| **Computer Vision** | YOLOv11 (Ultralytics), TensorFlow Lite (INT8) | On-device lightweight object detection and classification |
| **Explainable AI** | Eigen-CAM (device), Grad-CAM (PyTorch validation) | Visual attention heatmaps for model decision transparency |
| **Climate Service** | Open-Meteo API (CC BY 4.0) | Current weather and 5-year historical monthly normals |
| **Conversational AI** | Google Gemini (v1beta) via Vercel proxy | Natural-language response synthesis with safety guards |
| **Cloud Synchronization** | Supabase (PostgreSQL), Vercel Serverless | Optional multi-device backup and rate-limited API gateway |
| **Hardware Access** | `expo-camera`, `expo-location`, `expo-image-picker` | Camera capture, distance guidance, and coarse geolocation |
| **Testing Frameworks** | Jest, Jest-Expo, React Native Testing Library, Vitest | Unit, component, repository, and integration testing |

---

## Research & Academic Context

This software repository serves as the technical implementation artifact for the following thesis study:

### Research Objectives
1. **Detection Performance**: Evaluate the accuracy of YOLOv11n in localizing and classifying fruit crop diseases across Precision, Recall, and F1-Score metrics.
2. **Severity Assessment**: Assess the capability of the system to quantify infection damage into Early, Moderate, and Severe categories using scale-invariant bounding area calculations.
3. **Interpretability & Transparency**: Determine the effectiveness of Explainable AI (Grad-CAM/Eigen-CAM) heatmaps in communicating diagnostic rationale to non-technical end-users.
4. **Actionable Recommendations**: Measure the practical utility and relevance of agriculturist-validated remedies and climate suitability assessments among target agrarian communities.

### Evaluation Metrics & Formulations

$$\text{Precision} = \frac{TP}{TP + FP} \qquad \text{Recall} = \frac{TP}{TP + FN} \qquad F_1 = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$

$$\text{Backbone Computational Complexity} \sim \mathcal{O}(L \times H \times W \times C^2)$$

### Ethical Compliance
This study adheres to the **Republic Act No. 10173** (Philippine Data Privacy Act of 2012). No private user media or fine-grained GPS telemetry is collected without explicit informed consent. All diagnostic features are fully accessible without creating a cloud account.

---

## Authors & Thesis Committee

### Researchers
- **Justin Gie E. Santander** — *Lead Researcher / Machine Learning & Systems*
- **Christian Ram O. Bernales** — *Lead Researcher / Software Architecture & Mobile Engineering*
- **Prince Peter T. Osorio** — *Lead Researcher / Agronomic Knowledge & Data Engineering*

### Academic Advisement
- **Ms. Josephine Eduardo** — *Thesis Adviser*
- **College of Science and Computer Studies** — *De La Salle University - Dasmariñas*

---

## License

This project is developed for academic research purposes. Underlying core components and templates are licensed under the BSD-0 License unless otherwise noted by institutional copyright.
