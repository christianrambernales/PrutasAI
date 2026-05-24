# PrutasAI 🍊

**A YOLOv11n-Based Fruit Disease Detection System with Explainable AI, Severity Classification, and Remedy Recommendation**

> Bachelor of Science in Computer Science — Intelligent Systems Track

---

## Overview

PrutasAI is a mobile application that detects diseases in selected fruits using a two-stage YOLOv11n deep learning pipeline. It provides:

- **Fruit Classification** — Identifies the fruit type from 5 supported classes (Stage 1 YOLO)
- **Disease Detection** — Detects disease and encircles the affected region with an ellipse overlay (Stage 2 YOLO)
- **Explainable AI (XAI)** — Grad-CAM heatmap overlays showing what the AI focused on
- **Severity Classification** — Early (<15%), Moderate (15–40%), or Severe (>40%) based on affected area proportion
- **Remedy Recommendations** — Agriculturist-validated, severity-specific treatment with timing, dosage, and prevention (bilingual EN/FIL)
- **Environmental Advisory** — Seasonal care advisories per fruit type (general, rainy, dry, hot season)
- **Recovery Monitoring** — Structured Day 1 → Day 5 → Day 10 follow-up progress tracking with auto-calculated checkpoint dates
- **Bilingual Support** — English and Filipino (Tagalog) across all content including remedies, advisories, and disease info
- **Role-Based Access** — User, Moderator, and Admin roles with JWT authentication (7-day token expiry)

---

## Supported Fruits

| Fruit | Enum Value |
|-------|------------|
| Mango | `mango` |
| Banana | `banana` |
| Papaya | `papaya` |
| Orange | `orange` |
| Capsicum | `capsicum` |

---

## Project Structure

```
PrustasAI/
├── README.md
├── backend/                        # Node.js Express API (port 3000)
│   ├── .env                        # Environment variables (not committed)
│   ├── .env.example                # Environment variable template
│   ├── .gitignore                  # Git ignore rules
│   ├── package.json
│   ├── uploads/                    # Temporary scan image storage (runtime)
│   └── src/
│       ├── server.js               # Express app entry point
│       ├── config/
│       │   └── db.js               # MongoDB connection
│       ├── middleware/
│       │   └── auth.js             # JWT authentication & role authorization middleware
│       ├── models/
│       │   ├── User.js             # User schema (name, email, role, language, profileImage)
│       │   ├── Scan.js             # Scan results schema (fruit, disease, severity, remedy, advisory)
│       │   ├── Disease.js          # Disease info schema (bilingual, severity-based remedies)
│       │   └── RecoverySession.js  # Recovery monitoring schema (checkpoints, progress tracking)
│       ├── controllers/
│       │   ├── auth.controller.js  # Register, login, logout, session, language update
│       │   ├── scan.controller.js  # Image upload, ML pipeline call, history
│       │   ├── disease.controller.js # Disease/fruit info queries (with localization)
│       │   └── recovery.controller.js # Recovery session CRUD
│       ├── routes/
│       │   ├── auth.routes.js      # /api/auth/*
│       │   ├── scan.routes.js      # /api/scan, /api/history
│       │   ├── disease.routes.js   # /api/diseases/*
│       │   └── recovery.routes.js  # /api/recovery/*
│       └── utils/
│           ├── remedyDB.js         # Agriculturist-validated bilingual remedy database
│           └── advisory.js         # Environmental advisory system (seasonal, per-fruit)
│
├── ml-model/                       # Python Flask ML Service (port 5000)
│   ├── app.py                      # Flask API entry point
│   ├── predict.py                  # Two-stage YOLO11n prediction pipeline
│   ├── gradcam.py                  # Grad-CAM XAI heatmap generation
│   ├── severity.py                 # Severity classification (area proportion)
│   ├── requirements.txt            # Python dependencies
│   ├── model/
│   │   ├── fruit_classifier.pt     # Stage 1 trained YOLO model weights
│   │   └── disease_detector.pt     # Stage 2 trained YOLO model weights
│   ├── uploads/                    # Temporary image uploads (runtime)
│   └── output/                     # Generated encircled & heatmap images (runtime)
│
└── mobile/                         # React Native + Expo app
    ├── App.js                      # Root component
    ├── index.js                    # Entry point
    ├── app.json                    # Expo config
    ├── .gitignore                  # Git ignore rules
    ├── package.json
    ├── assets/                     # App icons and splash screen
    └── src/
        ├── navigation/
        │   └── AppNavigator.js     # Stack + tab navigation (auth-gated)
        ├── screens/
        │   ├── LoginScreen.js      # Login & register
        │   ├── HomeScreen.js       # Dashboard with supported fruits grid
        │   ├── CameraScreen.js     # Image capture / gallery picker with distance guidance
        │   ├── ResultScreen.js     # Scan results (disease ranking, severity, remedy, XAI)
        │   ├── HistoryScreen.js    # Past scan history
        │   ├── RecoveryScreen.js   # Recovery session tracking
        │   └── SettingsScreen.js   # Language & account settings
        ├── context/
        │   ├── AuthContext.js      # Auth state (token, user) with AsyncStorage
        │   └── LanguageContext.js  # Language preference (en / fil)
        ├── services/
        │   └── api.js              # All backend API calls (fetch-based, Bearer auth)
        ├── i18n/
        │   ├── en.json             # English translations
        │   └── fil.json            # Filipino (Tagalog) translations
        └── utils/
            └── theme.js            # Design system (colors, typography, spacing)
```

---

## Detection Pipeline

| Step | Stage | Description |
|------|-------|-------------|
| 1 | **Auth** | User registers/logs in → JWT issued (7-day expiry) |
| 2 | **Image Acquisition** | Camera capture or gallery picker (CameraScreen) |
| 3 | **Fruit Classification** | Stage 1 YOLO11n → classifies fruit type (5 classes) |
| 4 | **Disease Detection** | Stage 2 YOLO11n → detects disease + bounding box |
| 5 | **Region Overlay** | Ellipse drawn over the detected disease area |
| 6 | **XAI Heatmap** | Grad-CAM generates overlay highlighting diagnostic regions |
| 7 | **Severity Assessment** | Area proportion: Early (<15%), Moderate (15–40%), Severe (>40%) |
| 8 | **Remedy Lookup** | Matched from `remedyDB.js`: treatment, timing, dosage, prevention (bilingual) |
| 9 | **Advisory** | Environmental advisory generated from `advisory.js` per fruit type |
| 10 | **Results Display** | Encircled image + heatmap + severity + remedy + advisory shown in ResultScreen |
| 11 | **Recovery Monitoring** | Day 1 → Day 5 → Day 10 follow-up scan checkpoints with progress tracking |

---

## API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/auth/session` | Yes | Get current user session |
| POST | `/auth/logout` | Yes | Logout (client-side token removal) |
| PATCH | `/auth/language` | Yes | Update preferred language |

### Scan — `/api`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/scan` | Yes | Upload image (10MB max; jpeg/jpg/png/webp), run full ML pipeline |
| GET | `/history` | Yes | Get paginated scan history (`?page=&limit=`) |
| GET | `/history/:id` | Yes | Get single scan result |
| DELETE | `/history/:id` | Yes | Delete a scan |

### Diseases — `/api/diseases`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/diseases` | Yes | List diseases (optional `?fruitType=`) |
| GET | `/diseases/fruits` | Yes | List supported fruits (bilingual names + emojis) |
| GET | `/diseases/:id` | Yes | Get single disease details (localized) |

### Recovery — `/api/recovery`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/recovery` | Yes | Start a recovery session from a scan |
| GET | `/recovery` | Yes | List recovery sessions (optional `?status=`) |
| GET | `/recovery/:id` | Yes | Get full recovery report |
| POST | `/recovery/:id/follow-up` | Yes | Add follow-up scan |
| PATCH | `/recovery/:id/resolve` | Yes | Resolve/close session |

### Health Check — `/api`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Backend service health check |

### ML Service — `http://localhost:5000`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | ML service health check |
| POST | `/api/predict` | Run fruit + disease detection on image |
| GET | `/api/image/<filename>` | Serve generated output images |

---

## Database Models

### User
| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Required, 2–100 chars |
| `email` | String | Unique, required, lowercase |
| `password` | String | bcrypt hashed (12 rounds), hidden from queries |
| `role` | Enum | `user`, `moderator`, `admin` (default: `user`) |
| `preferredLanguage` | Enum | `en`, `fil` (default: `en`) |
| `profileImage` | String | Optional profile image path |

### Scan
| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId | Ref to User, indexed |
| `originalImage` | String | Path to uploaded original image |
| `fruitType` | Enum | `mango`, `banana`, `papaya`, `orange`, `capsicum`, `unknown` |
| `fruitConfidence` | Number | 0–1, fruit classification confidence |
| `disease` | String | Disease name or `healthy` |
| `diseaseConfidence` | Number | 0–1, disease detection confidence |
| `isHealthy` | Boolean | Whether the fruit is disease-free |
| `detectionRegion` | Object | `{ x, y, width, height }` — bounding box coordinates |
| `severity` | Enum | `healthy`, `early`, `moderate`, `severe` |
| `severityPercentage` | Number | 0–100 |
| `remedy` | Object | `{ treatment, timing, dosage, prevention }` — bilingual `{ en, fil }` |
| `advisory` | String | Environmental care advisory |
| `language` | Enum | `en`, `fil` — language used for this scan |
| `encircledImage` | String | Path to ellipse overlay image |
| `heatmapImage` | String | Path to Grad-CAM heatmap image |

Compound index: `{ user: 1, createdAt: -1 }`

### Disease
| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Required, unique (internal key) |
| `displayName` | Object | `{ en, fil }` — bilingual display name |
| `fruitType` | Enum | `mango`, `banana`, `papaya`, `orange`, `capsicum` |
| `description` | Object | `{ en, fil }` — bilingual description |
| `symptoms` | Object | `{ en: [String], fil: [String] }` — symptom lists |
| `causes` | Object | `{ en, fil }` — cause description |
| `referenceImages` | Array | `[{ url, caption: { en, fil } }]` — reference images |
| `remedies` | Object | Nested by severity (`early`/`moderate`/`severe`), each with `{ treatment, timing, dosage, prevention }` — all bilingual `{ en, fil }` |

Compound index: `{ fruitType: 1, name: 1 }`

### RecoverySession
| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId | Ref to User, indexed |
| `initialScan` | ObjectId | Ref to Scan |
| `fruitType` | Enum | `mango`, `banana`, `papaya`, `orange`, `capsicum` |
| `disease` | String | Disease being tracked |
| `status` | Enum | `active`, `completed`, `abandoned` (default: `active`) |
| `progressStatus` | Enum | `improving`, `worsening`, `stable`, `new_disease_found`, `resolved` |
| `checkpoints` | Array | Checkpoint entries (see below) |
| `startDate` | Date | Session start date |
| `expectedDay5` | Date | Auto-calculated: startDate + 4 days |
| `expectedDay10` | Date | Auto-calculated: startDate + 9 days |
| `completedAt` | Date | Session completion date |

**Checkpoint sub-schema:**
| Field | Type | Notes |
|-------|------|-------|
| `day` | Number | Enum: `1`, `5`, `10` |
| `scan` | ObjectId | Ref to Scan (follow-up scan result) |
| `severity` | Enum | `healthy`, `early`, `moderate`, `severe` |
| `severityPercentage` | Number | 0–100 |
| `encircledImage` | String | Follow-up encircled image |
| `heatmapImage` | String | Follow-up heatmap image |
| `notes` | Object | `{ en, fil }` — bilingual notes |
| `scannedAt` | Date | Timestamp of checkpoint scan |

---

## Getting Started

### Prerequisites
Install these on the target device before setup:
- **Node.js** v18+ — https://nodejs.org
- **Python** 3.10 or 3.11 — https://python.org *(check "Add to PATH" during install)*
- **MongoDB** Community — https://www.mongodb.com/try/download/community

---

### 1. Backend Setup
```bash
cd backend
npm install
# Copy .env.example to .env and fill in your values
npm run dev
```

### 2. ML Model Setup
```bash
cd ml-model
pip install -r requirements.txt
# Ensure model weights are placed in ml-model/model/:
#   fruit_classifier.pt
#   disease_detector.pt
python app.py
```

### 3. Mobile App Setup
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code with the **Expo Go** app, or press `w` to open in a browser.

> ⚠️ Update `API_BASE_URL` in `mobile/src/services/api.js` to match the IP address of the machine running the backend (currently set to `localhost` — change this to your machine's IP when testing on a physical device via Expo Go).

---

## Environment Variables (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Backend server port |
| `MONGODB_URI` | `mongodb://localhost:27017/prutasai` | MongoDB connection string |
| `JWT_SECRET` | *(change this)* | JWT signing secret |
| `ML_SERVICE_URL` | `http://localhost:5000` | ML Flask service URL |

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Mobile** | React Native, Expo SDK 54, React Navigation v7, AsyncStorage, Expo Image Picker |
| **Backend** | Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Multer, Axios |
| **ML Service** | Python, Flask, Flask-CORS, Ultralytics YOLO11n, PyTorch, OpenCV |
| **XAI** | Grad-CAM (Gradient-weighted Class Activation Mapping) |
| **Bilingual** | English + Filipino (Tagalog) via i18n JSON + bilingual remedy/advisory/disease data |
| **Training** | Google Colab (GPU) — not run locally |

---

## Authors

- Justin Gie E. Santander
- Christian Ram O. Bernales
- Prince Peter T. Osorio

**Thesis Adviser**: Ms. Josephine Eduardo
