# PrutasAI Thesis 2 — Design Specification

Date: 2026-08-10
Branch: `final` (the `prototype` branch is frozen as the Thesis 1 reference)

## 1. Purpose

Transform PrutasAI from the Thesis 1 prototype into the Thesis 2 application. The system
identifies a fruit, then its Philippine variety, then any disease present, grades the severity,
and recommends an agriculturist-sourced remedy. It works without an internet connection, keeps
climate data cached locally, and includes an agricultural chatbot that gives location-aware
planting assessments.

The thesis title, the four research questions, and the precision/recall/F1 evaluation plan are
unchanged. Variety identification is a new layer inserted between fruit and disease.

## 2. What changes from Thesis 1, and why

| Thesis 1 | Thesis 2 | Reason |
|---|---|---|
| 5 fruits (mango, banana, papaya, orange, capsicum) | 3 fruits (banana, mango, papaya) | Narrowed scope per Thesis 2 objectives |
| Fruit → Disease | Fruit → Variety → Disease | New variety-identification contribution |
| Server-side inference (Flask) | On-device inference (TFLite INT8) | Matches the operational framework in the thesis document; enables true offline use |
| MongoDB | SQLite, on device and server | Thesis document specifies SQLite; data is relational; removes a service install |
| Node/Express + Python Flask | Python FastAPI (optional service only) | One language for server, training, export, evaluation; the server is now small and optional |
| Mandatory login | Optional accounts | An offline-first field tool cannot require a network login to start |
| No climate data | Cached Open-Meteo climate + normals | New Thesis 2 requirement |
| No chatbot | Grounded chatbot with Groq phrasing | New Thesis 2 requirement |
| Fruit list hardcoded in 6 places | One `knowledge/` source of truth | Adding a variety must not require 6 synchronised edits |
| Mock predictions when weights missing | Explicit "model not installed" state | The system must never fabricate a detection |

### Defects being fixed

- `ml-model/predict.py:162` returns a hardcoded `mango` at 0.85 confidence when weights are
  absent, and `_detect_disease` returns `is_healthy: true` with the disease
  `training_in_progress`. Both are removed.
- `ml-model/severity.py:31` divides lesion area by whole-image area, so severity depends on
  camera distance. Stage 1 now supplies the fruit bounding box, so severity becomes
  lesion area ÷ fruit area.
- `ml-model/gradcam.py` calls `.train()` on the network and never runs a backward pass, so
  gradients are always `None` and it silently falls back to a Gaussian blob drawn from the
  bounding box. Replaced (see §8).
- `backend/package.json` declares `npm run seed` pointing at a non-existent
  `src/utils/seedDiseases.js`.
- `mobile/src/services/api.js:7` hardcodes `http://localhost:3000`.
- `ml-model/model/README.md` references a `notebooks/` directory that does not exist.

## 3. Architecture

Two runtimes. The Expo application is the product and functions entirely on its own. The Python
service is optional and only needed for account sync and admin content review; the app is fully
usable when it is never deployed.

```
prutasai/
├── app/                          Expo React Native application
│   ├── .env.example              Placeholders only; .env is untracked
│   ├── eas.json                  Build profiles; `preview` emits .apk
│   ├── assets/models/            Generated: synced from models/, gitignored
│   └── src/
│       ├── core/
│       │   ├── db/               SQLite open, migrations, seeding, repositories
│       │   ├── ml/               TFLite runtime, model registry, staged pipeline
│       │   ├── climate/          Provider interface, Open-Meteo, cache, refresh
│       │   ├── location/         Permission-gated coarse location
│       │   ├── chat/             Intent, context, verdict, providers
│       │   ├── sync/             Connectivity watcher, optional sync queue drain
│       │   └── status/           SystemStatus aggregation
│       ├── features/             detection, variety, climate, chat, history, monitoring
│       └── ui/                   Presentational components (front-end plugin owns these)
├── knowledge/                    Single source of truth, versioned, cited
│   ├── taxonomy.yaml
│   ├── crop-requirements.yaml
│   ├── diseases.yaml
│   ├── remedies.yaml
│   └── sources.yaml
├── ml/                           Python: training, export, evaluation, reference XAI
│   ├── training/  export/  xai/  eval/
├── models/                       Trained weights land here
│   └── manifest.json
├── scripts/                      knowledge compiler, seed generator, checksum tool,
│                                 sync-models (models/ → app/assets/models/)
├── server/                       Optional FastAPI service
└── docs/
```

### 3.1 The knowledge base

`knowledge/` holds every agricultural and taxonomic fact as versioned YAML. A build script
(`scripts/compile-knowledge`) compiles it into three artifacts:

1. `app/src/core/db/seed.sql` — content-table seed data bundled with the app
2. `ml/classes.json` — the class-index map used by training and by `models/manifest.json`
3. `app/src/core/types/knowledge.d.ts` — generated TypeScript types

Adding a variety is: edit `taxonomy.yaml`, run the compiler, retrain one classifier head.
No other file changes.

The compiler stamps a `content_version` (date-based, e.g. `2026.08.10`) into the generated
`seed.sql`. This is separate from `models/manifest.json`, which versions weights only — content
and weights change independently and must not be coupled.

Every content row carries a `source_id` referencing `sources.yaml`. The compiler fails the build
on a missing or dangling reference. Rows whose citation is not yet supplied are marked
`source: unverified`, which the compiler reports as a warning and the UI renders with a caveat.

**Known gap.** The Thesis 1 `remedyDB.js` and `advisory.js` contain specific fungicide names and
dosages ("2.5g Mancozeb per liter", "hot water at 52°C for 10 minutes") described in the thesis
as agriculturist-validated, but carry no citations in the code. This text is ported verbatim and
marked `unverified` until the project's agriculturist supplies references or sign-off. These are
pesticide instructions given to farmers; the gap is surfaced rather than hidden.

## 4. Fruit and variety taxonomy

11 variety classes across 3 fruits.

| Fruit | Varieties (ML classes) |
|---|---|
| Banana | Lakatan, Latundan, Saba, Cavendish |
| Mango | Carabao, Pico, Katchamita (Indian) |
| Papaya | Solo, Cavite Special, Red Lady, Sinta |

Basis: Cavendish is roughly 53% of national banana production, Saba 28%, Lakatan 10%. Carabao
covers about 81% of mango area, with Pico and Katchamita the other two commercially named
cultivars. Sinta is the UPLB Institute of Plant Breeding hybrid; Solo, Cavite Special and Red
Lady are among the seven varieties grown commercially.

Two constraints encoded in the data model:

- **Strains are not classes.** The 14 NSIC-approved Carabao strains (GES 73, GES 77, MMSU Gold,
  Sweet Elena, Guimaras Super and others) are clonal selections and are not separable from a
  photograph. They exist as `variety` rows with `parent_variety_id → carabao` and
  `is_ml_class = false`, so they appear in the information layer and never in the classifier.
- **Papaya is the weakest case.** Sinta, Red Lady and Cariñosa differ mainly in flesh colour,
  which an exterior photograph does not show. The papaya head ships with a raised confidence
  threshold and a prominent "variety undetermined" result.

`taxonomy.yaml` shape:

```yaml
fruits:
  - key: banana
    name: { en: Banana, fil: Saging }
    ml_class_index: 0
    varieties:
      - key: lakatan
        name: { en: Lakatan, fil: Lakatan }
        ml_class_index: 0
        is_ml_class: true
        sources: [pcaarrd_banana_varieties]
```

`ml_class_index` on a fruit is global across the Stage 1 detector. On a variety it is scoped to
that fruit's own Stage 2 head, so Lakatan and Carabao are both index 0 in their respective
classifiers. Indices are assigned only to rows with `is_ml_class: true`.

## 5. Detection pipeline

Three stages run on the device. Each is independently optional.

| Stage | Model | Task | Output |
|---|---|---|---|
| 1 | `fruit_detector` | YOLO11n detection, 3 classes | Fruit class, confidence, bounding box |
| 2 | `variety_banana` / `variety_mango` / `variety_papaya` | YOLO11n-cls on the crop | Variety class, confidence |
| 3 | `disease_detector` | Detection on the crop | Disease class, confidence, lesion box |

Stage 2 is one small classifier per fruit rather than a single 11-class model. Adding a banana
variety retrains only `variety_banana`, and a missing mango head does not disable banana
varieties.

### 5.1 Degradation ladder

The pipeline stops at the first stage whose model is absent or whose confidence falls below its
configured threshold, and reports what it actually knows.

| Available | Result |
|---|---|
| No models | "Detection model not installed" — browsing, climate and chat still work |
| Stage 1 only | "Banana — variety not determined" |
| Stage 1 + its Stage 2 head | "Banana → Lakatan — disease model not installed" |
| All three | Full result with severity and remedy |
| Stage 1 below threshold | "Could not identify a fruit — retake the photo" |

No stage ever substitutes a guess for a missing model.

### 5.2 Model registry

`models/manifest.json` is the only place model files are declared:

```json
{
  "manifest_version": 1,
  "models": [
    {
      "id": "fruit_detector",
      "stage": 1,
      "file": "fruit_detector_v1.tflite",
      "sha256": "<hex>",
      "input": { "width": 640, "height": 640, "channels": 3, "dtype": "uint8" },
      "classes_ref": "fruits",
      "min_confidence": 0.50,
      "version": "1.0.0"
    }
  ]
}
```

At startup the app reads the manifest, checks each file exists and its SHA-256 matches, and
publishes a `ModelStatus` record per model (`ready`, `missing`, `checksum_mismatch`,
`load_failed`). A contract test asserts every `classes_ref` resolves against the compiled
`ml/classes.json` and that class counts agree.

### 5.3 Two model sources

An installed Android APK is read-only, so "drop a file in a folder and restart" cannot work
against a distributed build. The resolver therefore checks two sources in order:

1. **Device storage** — `file://` under the app's document directory. Lets a model be added to an
   already-installed app without rebuilding.
2. **Bundled asset** — `require()`d from `app/assets/models/`, baked in at build time.

Bundled assets are the reliable path: `react-native-fast-tflite` has open Android defects loading
`file://` paths (issues #63, #80) and failing GPU delegates on local files (#84). Device storage
is therefore an opt-in research affordance, and any failure to load from it falls back to the
bundled asset rather than surfacing an error.

`models/` at the repository root stays the single designated directory that trained weights are
placed into. `scripts/sync-models.mjs` copies them into `app/assets/models/` and regenerates the
`require()` map, and runs automatically from npm `prestart` and `prebuild` hooks — so placing a
file in `models/` and starting the app is still the whole workflow, with the copy step invisible.

This gives two workflows, both without code changes:

- **Development, and producing a release build** — put the `.tflite` in `models/`, update its
  manifest entry, start or rebuild. This is the supported path for shipping a model.
- **Adding a model to an installed APK** — import the `.tflite` through the Model Status screen's
  file picker, which copies it into the document directory and records its checksum. Useful for
  swapping in a newly trained model on a device already in someone's hands, with the Android
  caveats above.

`ModelStatus` reports which source each loaded model came from, so a demo can never leave anyone
guessing whether the bundled or the sideloaded weights are in use.

## 6. Severity

Severity is the lesion area from Stage 3 divided by the **fruit bounding-box area from Stage 1**,
not by the whole image. Thresholds are unchanged from Thesis 1 so results stay comparable:
Early below 15%, Moderate 15–40%, Severe above 40%. When Stage 1 produced no box, severity is
reported as `undetermined` rather than computed against the frame.

## 7. Awareness-only conditions

`fruit_disease.surface` (`leaf`, `fruit`, `both`) and `disease.is_awareness_only` encode
Table 3.3.1 of the thesis document as data. Mold and Rot are awareness-only: they produce a
banner advising isolation or disposal, are recorded in history, and skip severity, remedy and
chat entirely. Anthracnose, Powdery Mildew, Rust, Scab and Blight follow the full pipeline.

## 8. Explainable AI

TFLite exposes no gradients, so Grad-CAM cannot run on the device. The exported model emits a
backbone feature map as a second output tensor, and the app computes **Eigen-CAM** — a published
activation-only CAM — over it. This is forward-only and runs on-device.

`ml/xai/` retains a correct gradient-based Grad-CAM in PyTorch for generating thesis figures and
for the research-question-3 evaluation, where a GPU is available. The two are documented as
serving different purposes: Grad-CAM for offline evaluation, Eigen-CAM for the shipped app.

This is an improvement on Thesis 1, where the Grad-CAM never computed gradients at all.

## 9. Data model

One SQLite schema, used on device and mirrored on the optional server, in two halves.

**Content tables** — seeded from `knowledge/`, read-only at runtime, dropped and reseeded when
`content_version` changes:

- `source` — `id`, `citation`, `url`, `retrieved_at`
- `fruit` — `id`, `key`, `name_en`, `name_fil`, `ml_class_index`
- `variety` — `id`, `fruit_id`, `key`, `name_en`, `name_fil`, `local_names`, `description_en`,
  `description_fil`, `ml_class_index`, `is_ml_class`, `parent_variety_id`, `source_id`
- `crop_requirement` — `id`, `fruit_id`, `variety_id` (nullable), `temp_opt_min_c`,
  `temp_opt_max_c`, `temp_abs_min_c`, `temp_abs_max_c`, `rainfall_annual_min_mm`,
  `rainfall_annual_max_mm`, `elevation_max_m`, `notes_en`, `notes_fil`, `source_id`
- `disease` — `id`, `key`, `name_en`, `name_fil`, `description_*`, `symptoms_*`, `causes_*`,
  `is_awareness_only`, `source_id`
- `fruit_disease` — `fruit_id`, `disease_id`, `surface`
- `remedy` — `id`, `disease_id`, `severity`, `treatment_*`, `timing_*`, `dosage_*`,
  `prevention_*`, `source_id`

**User tables** — mutable, migrated and never dropped:

- `scan` — `id`, `uuid`, `image_uri`, `fruit_id`, `fruit_conf`, `variety_id`, `variety_conf`,
  `disease_id`, `disease_conf`, `severity`, `severity_pct`, `bbox_json`, `lesion_box_json`,
  `xai_image_uri`, `manifest_version`, `created_at`, `synced_at`
- `monitoring_session` — `id`, `initial_scan_id`, `status`, `progress_status`, `start_date`,
  `expected_day5`, `expected_day10`, `completed_at`
- `monitoring_checkpoint` — `id`, `session_id`, `day`, `scan_id`, `severity`, `severity_pct`,
  `notes_*`, `scanned_at`
- `climate_location` — `id`, `label`, `lat_r`, `lon_r`, `elevation_m`, `is_current`, `source`
  (`gps` or `manual`)
- `climate_observation` — `id`, `location_id`, `observed_at`, `fetched_at`, `temp_c`,
  `humidity_pct`, `precipitation_mm`, `provider`
- `climate_normal` — `id`, `location_id`, `month`, `temp_mean_c`, `rainfall_mm`,
  `computed_from_years`, `fetched_at`, `provider`
- `chat_thread` — `id`, `scan_id` (nullable), `title`, `created_at`
- `chat_message` — `id`, `thread_id`, `role`, `text`, `verdict_json`, `provider`, `created_at`
- `setting` — `key`, `value`
- `sync_queue` — `id`, `entity`, `entity_id`, `op`, `created_at`
- `schema_version` — `version`, `applied_at`

Migrations are numbered SQL files applied on startup against `schema_version`.

## 10. Climate

`ClimateProvider` is an interface; `OpenMeteoProvider` is the only implementation shipped.
Open-Meteo requires no API key and permits 10,000 calls per day for non-commercial use under
CC BY 4.0, so attribution is displayed in the app and there is no secret to configure. Adding a
second provider means implementing the interface and registering it.

Coordinates are rounded to **2 decimal places** (~1.1 km) before any storage or request.

Two distinct kinds of climate data, because they answer different questions:

- **`climate_observation`** — current conditions. Freshness window 3 hours. Answers "what is the
  weather now".
- **`climate_normal`** — monthly temperature and rainfall normals derived from the Open-Meteo
  archive over the past 5 years. Refreshed at most every 90 days. Answers "does this crop grow
  here", which today's temperature cannot.

Suitability assessments use normals. Today's observation is displayed but is not the basis of a
verdict — a cool morning does not make a location unsuitable for bananas.

Four freshness states are always surfaced:

| State | Meaning |
|---|---|
| `live` | fetched during this session |
| `cached` | within the freshness window |
| `stale` | older, displayed with its age ("offline data from 14h ago") |
| `unavailable` | never fetched for this location |

The UI renders from cache first and never blocks on the network. A connectivity listener
(`expo-network`) triggers, on an offline→online transition: refresh the current location's
observation, refresh normals if older than 90 days, then drain `sync_queue`. The same refresh
runs on app foreground when data is stale.

## 11. Location and privacy

- `expo-location`, foreground only, `Accuracy.Low`.
- Permission is requested **lazily**, at the moment a location-dependent question is asked —
  never at launch.
- Coordinates are rounded to 2 decimal places before being stored. Raw GPS is never persisted.
- "Forget my location" clears `climate_location` rows and revokes the stored permission state.
- Coordinates are **never** sent to the LLM provider. Only a coarse place name and the derived
  climate summary leave the device.
- Without permission the chatbot states this plainly and offers a province/municipality picker
  seeded from a bundled static list, which also serves as the offline path.

## 12. Chatbot

Five steps. The verdict is computed deterministically; the language model only rewords it.

1. **Intent and slots.** A deterministic matcher over a fixed intent set: `crop_suitability`,
   `fruit_info`, `variety_info`, `disease_info`, `remedy`, `climate_now`, `about_scan`,
   `fallback`. Slots extracted: fruit, variety, location, timeframe.
2. **Context assembly.** Pulls structured rows — the referenced scan, climate normals and
   current observation with freshness, coarse location, `crop_requirement`, `disease`,
   `remedy` — each with its `source_id`.
3. **Verdict computation.** A pure function, no model involved:

   The three compared parameters come from `climate_normal` and `climate_location`, never from
   the current observation: mean annual temperature (mean of the 12 monthly normals), annual
   rainfall (sum of the 12 monthly normals), and elevation. A parameter with no data is
   `unknown` and does not by itself force a verdict unless all three are unknown.

   - `insufficient_data` — location unknown, or no `climate_normal` rows for it, or no
     `crop_requirement` row for the fruit
   - `unsuitable` — any known parameter outside its tolerated range
   - `suitable` — every known parameter inside its optimal range, and none unknown
   - `potentially_suitable` — otherwise: inside tolerated but outside optimal, or some
     parameters known and inside range while others are unknown

   It returns an evidence list — one entry per parameter with its value, the optimal and
   tolerated ranges, and a status of `optimal` / `tolerated` / `outside` / `unknown` — plus the
   climate freshness, the normals' `fetched_at`, and the source ids. Every displayed claim
   traces to a row.

4. **Rendering.** `TemplateProvider` renders the verdict, its evidence and its sources in EN or
   FIL from curated strings, and is always available with no network. `GroqProvider` is used
   when reachable: the assembled facts and the computed verdict are sent with instructions to
   reword only, and the response is validated before display.
5. **Output guards.** The Groq call uses JSON mode returning `{ text, verdict_echo }`. The
   response is discarded and the template used instead if `verdict_echo` differs from the
   computed verdict, or if any numeric token in `text` does not appear in the supplied facts.
   Timeouts and errors fall back silently to the template.

`ChatProvider` interface: `id`, `isAvailable()`, `rephrase(groundedAnswer, options)`. Adding a
provider means implementing it and registering it in the provider list.

**Groq configuration.** Default model `llama-3.3-70b-versatile`; `llama-3.1-8b-instant` is
available for lower latency. Both support JSON mode. Tagalog is not among Llama 3.3's officially
supported languages, which is tolerable precisely because Filipino content comes from the
curated knowledge base rather than from the model — the template path is fully bilingual by
construction.

**Key handling.** The API key is read from `EXPO_PUBLIC_GROQ_API_KEY` in `app/.env`, which is
untracked; `app/.env.example` holds a placeholder. A key bundled into a mobile app is
extractable from the package by anyone who unpacks it — unavoidable without a proxy, which is
out of scope because no server will be hosted. The key is treated as disposable and should be
rotated after the defence. If the variable is absent the app runs normally on the template path.

## 13. Optional server

FastAPI plus SQLite, sharing the schema and migrations with the app. It provides account
registration and login (JWT), history sync via the `sync_queue`, and the Admin/Moderator content
review from the use case diagram. It is not required: the app is fully functional anonymously
and offline, and the account layer stays inert until a server URL is configured via
`EXPO_PUBLIC_SYNC_SERVER_URL`. Nothing in the detection, climate or chat paths depends on it.

## 14. Frontend architecture

`core/` exposes typed repositories and hooks over SQLite; `features/` hold screen logic and
state; `ui/` holds presentational components with no data access. The front-end design plugin
owns `ui/` and the styling, and can restyle freely without touching data flow.

Screens: Home, Capture, Result, Fruit and Variety Info, Climate, Chat, History, Monitoring,
Settings, Model Status.

State: local component state for ephemeral UI, a small global store for `SystemStatus`, language
and current location. All persistent data reads go through repositories, never direct SQL from
components.

## 15. Android packaging and distribution

The deliverable is a sideloadable `.apk` for Android. Because `react-native-fast-tflite`,
`expo-sqlite`, `expo-location` and `expo-image-picker` include native code, the app cannot run in
Expo Go and requires a prebuild. This is the normal path to an APK, not an obstacle.

**Build.** `npx expo prebuild --platform android` generates the native project, then either:

- **EAS Build** — `eas build -p android --profile preview`, with the `preview` profile setting
  `"android": { "buildType": "apk" }`. EAS defaults to `.aab`, which is only needed for Play
  Store submission, so the profile must set `apk` explicitly. Requires an Expo account and
  internet; keystore is managed for you.
- **Local Gradle** — `cd android && ./gradlew assembleRelease`. Requires the Android SDK and a
  JDK, needs a keystore generated with `keytool`, and needs no Expo account or network. This is
  the fallback if EAS quota or connectivity is a problem near the defence.

Both are documented in the README. `eas.json` is committed; the keystore never is.

**Permissions** declared in `app.json`: `CAMERA` (capture), `ACCESS_COARSE_LOCATION` (climate and
suitability — fine location is deliberately not requested), and `INTERNET`. The prototype's
`READ_EXTERNAL_STORAGE` is dropped in favour of the scoped photo picker.

**ABI and size.** Target `arm64-v8a` for the release APK, which covers effectively all current
Android devices; a universal APK is available if an older test device requires `armeabi-v7a`.
Expected size is roughly 60–90 MB with all five INT8 models bundled, which is fine for
sideloading and irrelevant for a thesis that is not shipping to the Play Store.

**Building without model weights is supported and tested.** The APK builds and installs with an
empty `models/` and a manifest listing no ready models; the app runs on the
degradation ladder in §5.1. This is the state the project is in until training finishes, so it is
a first-class case, not a fallback.

## 16. Configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `EXPO_PUBLIC_GROQ_API_KEY` | `app/.env` | unset | Enables LLM phrasing; unset means template-only |
| `EXPO_PUBLIC_GROQ_MODEL` | `app/.env` | `llama-3.3-70b-versatile` | Groq model id |
| `EXPO_PUBLIC_CLIMATE_PROVIDER` | `app/.env` | `open-meteo` | Selects climate provider |
| `EXPO_PUBLIC_SYNC_SERVER_URL` | `app/.env` | unset | Enables optional accounts and sync |
| `PRUTASAI_DB_PATH` | server env | `./prutasai.db` | Server SQLite path |
| `PRUTASAI_JWT_SECRET` | server env | unset (required to start) | JWT signing |

No secret, credential or absolute machine path appears in tracked files. `.gitignore` covers
`.env`, `*.tflite`, `*.pt`, and `models/*` except `manifest.json`.

## 17. Failure states

`SystemStatus` aggregates every dependency so one surface explains what is degraded.

| Dependency | Absent | Behaviour |
|---|---|---|
| Model weights | Not in `models/`, or checksum mismatch | Pipeline stops at the last ready stage; status names the missing model |
| Internet | No connectivity | Cached climate with age label; chat on template path; sync queued |
| Climate cache | Never fetched here | `unavailable`; suitability returns `insufficient_data` |
| Location | Denied or unavailable | Chat states it and offers manual location entry |
| Groq | Unreachable, no key, timeout, failed guard | Template response, no user-visible error |
| Server | Not configured or unreachable | Anonymous mode; sync queued |

Rule: a fallback may produce less information, or clearly-labelled older information. It may
never produce fabricated information.

## 18. Testing

Pure logic, where failures are silent:

- Suitability verdict matrix: every `insufficient_data` trigger, boundary values exactly on the
  optimal and tolerated edges, and partially-unknown parameter sets resolving to
  `potentially_suitable` rather than `suitable`
- Scale-invariant severity, including the missing-bounding-box case
- Degradation ladder across all model-presence combinations, including a present banana head
  with a missing mango head
- Climate freshness transitions and the offline→online refresh
- Numeric guard and `verdict_echo` mismatch both forcing the template path

Contract and integration:

- Compiled `ml/classes.json` matches `models/manifest.json` class counts and `classes_ref`
- Every content row resolves a `source_id`; unverified rows are reported
- Migrations from fresh install and from each prior `schema_version`
- Content reseed on `content_version` change preserves all user tables
- App starts, navigates and answers chat questions with zero model files present
- `scripts/sync-models` produces an empty but valid require map when `models/` is empty, so a
  release APK builds with no weights
- Release APK builds and installs on a physical Android device, both with and without weights

Manual: an airplane-mode script covering scan, climate display, chat and reconnect.

## 19. Migration from the prototype

`final` is restructured into the layout in §3. `prototype` is not modified.

Ported: EN/FIL i18n JSON, theme tokens, remedy and advisory text (into `knowledge/`, marked
unverified pending citations), severity thresholds, and the existing screens as reference for
the front-end plugin.

Removed: MongoDB and Mongoose, Express routes and controllers, the Flask service, the mock
prediction paths, the broken `seed` script, `orange` and `capsicum` throughout.

The trained 5-class `fruit_classifier.pt` present locally is superseded by the 3-class Stage 1
detector and is not carried forward.

## 20. Risks

- **Datasets do not exist yet for 11 variety classes.** This is the critical path. The
  architecture is complete and testable without them, but no accuracy claim can be made until
  they are collected and labelled.
- **Papaya variety separation may not be achievable from exterior photographs.** Mitigated by
  the "variety undetermined" path; if accuracy is unacceptable the papaya head can ship
  disabled without any code change.
- **YOLO TFLite latency on mid-range Android** is reported as a real concern in the
  `react-native-fast-tflite` issue tracker. Mitigations: INT8 quantisation, 640px input, NNAPI
  and GPU delegates. Needs measurement on the target device early.
- **Loading models from device storage is unreliable on Android.** Open `react-native-fast-tflite`
  defects (#63, #80, #84) affect `file://` paths and GPU delegates on local files. Mitigated by
  treating bundled assets as the supported path and device storage as opt-in with fallback; a
  model can always be shipped by rebuilding the APK.
- **Remedy citations are missing.** Blocks the `unverified` flag being cleared; requires the
  project's agriculturist.
- **The Groq key is extractable from the app package.** Accepted for the defence; rotate after.

## 21. Out of scope

Cross-device real-time collaboration, cloud model serving, pest (as opposed to disease)
identification, yield prediction, marketplace or pricing features, and languages beyond English
and Filipino.
