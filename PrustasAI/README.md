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
- **Remedy Recommendations** — Agriculturist-validated treatment with timing, dosage, and prevention
- **Recovery Monitoring** — Structured Day 1 → Day 5 → Day 10 follow-up progress tracking
- **Bilingual Support** — English and Filipino (Tagalog)
- **Role-Based Access** — User, Moderator, and Admin roles with JWT authentication

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
│   ├── package.json
│   ├── uploads/                    # Temporary scan image storage (runtime)
│   └── src/
│       ├── server.js               # Express app entry point
│       ├── config/
│       │   └── db.js               # MongoDB connection
│       ├── middleware/
│       │   └── auth.js             # JWT authentication middleware
│       ├── models/
│       │   ├── User.js             # User schema (name, email, role, language)
│       │   ├── Scan.js             # Scan results schema (fruit, disease, severity, remedy)
│       │   ├── Disease.js          # Disease info schema
│       │   └── RecoverySession.js  # Recovery monitoring schema
│       ├── controllers/
│       │   ├── auth.controller.js  # Register, login, session, language update
│       │   ├── scan.controller.js  # Image upload, ML pipeline call, history
│       │   ├── disease.controller.js # Disease/fruit info queries
│       │   └── recovery.controller.js # Recovery session CRUD
│       ├── routes/
│       │   ├── auth.routes.js      # /api/auth/*
│       │   ├── scan.routes.js      # /api/scan, /api/history
│       │   ├── disease.routes.js   # /api/diseases/*
│       │   └── recovery.routes.js  # /api/recovery/*
│       └── utils/
│           ├── remedyDB.js         # Agriculturist-validated remedy database
│           └── advisory.js         # Environmental advisory system
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
    ├── package.json
    ├── assets/                     # App icons and splash screen
    └── src/
        ├── navigation/
        │   └── AppNavigator.js     # Stack + tab navigation (auth-gated)
        ├── screens/
        │   ├── LoginScreen.js      # Login & register
        │   ├── HomeScreen.js       # Dashboard
        │   ├── CameraScreen.js     # Image capture / gallery picker
        │   ├── ResultScreen.js     # Scan results (disease, severity, remedy, XAI)
        │   ├── HistoryScreen.js    # Past scan history
        │   ├── RecoveryScreen.js   # Recovery session tracking
        │   └── SettingsScreen.js   # Language & account settings
        ├── context/
        │   ├── AuthContext.js      # Auth state (token, user)
        │   └── LanguageContext.js  # Language preference (en / fil)
        ├── services/
        │   └── api.js              # All backend API calls (fetch-based)
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
| 1 | **Auth** | User registers/logs in → JWT issued |
| 2 | **Image Acquisition** | Camera capture or gallery picker (CameraScreen) |
| 3 | **Fruit Classification** | Stage 1 YOLO11n → classifies fruit type (5 classes) |
| 4 | **Disease Detection** | Stage 2 YOLO11n → detects disease + bounding box |
| 5 | **Region Overlay** | Ellipse drawn over the detected disease area |
| 6 | **XAI Heatmap** | Grad-CAM generates overlay highlighting diagnostic regions |
| 7 | **Severity Assessment** | Area proportion: Early (<15%), Moderate (15–40%), Severe (>40%) |
| 8 | **Remedy Lookup** | Matched from `remedyDB.js`: treatment, timing, dosage, prevention |
| 9 | **Results Display** | Encircled image + heatmap + severity + remedy shown in ResultScreen |
| 10 | **Recovery Monitoring** | Day 1 → Day 5 → Day 10 follow-up scan checkpoints |

---

## API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/session` | Get current user session |
| PATCH | `/auth/language` | Update preferred language |

### Scan — `/api`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/scan` | Upload image, run full ML pipeline |
| GET | `/history` | Get paginated scan history |
| GET | `/history/:id` | Get single scan result |
| DELETE | `/history/:id` | Delete a scan |

### Diseases — `/api/diseases`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/diseases` | List diseases (optional `?fruitType=`) |
| GET | `/diseases/fruits` | List supported fruits |

### Recovery — `/api/recovery`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/recovery` | Start a recovery session from a scan |
| GET | `/recovery` | List recovery sessions (optional `?status=`) |
| GET | `/recovery/:id` | Get full recovery report |
| POST | `/recovery/:id/follow-up` | Add follow-up scan |
| PATCH | `/recovery/:id/resolve` | Resolve/close session |

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
| `name` | String | Required |
| `email` | String | Unique, required |
| `password` | String | bcrypt hashed, hidden from queries |
| `role` | Enum | `user`, `moderator`, `admin` |
| `preferredLanguage` | Enum | `en`, `fil` |

### Scan
| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId | Ref to User |
| `fruitType` | Enum | `mango`, `banana`, `papaya`, `orange`, `capsicum`, `unknown` |
| `disease` | String | Disease name or `healthy` |
| `severity` | Enum | `healthy`, `early`, `moderate`, `severe` |
| `severityPercentage` | Number | 0–100 |
| `remedy` | Object | `treatment`, `timing`, `dosage`, `prevention` |
| `encircledImage` | String | Path to ellipse overlay image |
| `heatmapImage` | String | Path to Grad-CAM heatmap image |

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

> ⚠️ Update `API_BASE_URL` in `mobile/src/services/api.js` to match the IP address of the machine running the backend (currently set to `192.168.137.1` for mobile hotspot use).

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
| **Mobile** | React Native, Expo SDK 54, React Navigation v7 |
| **Backend** | Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Multer |
| **ML Service** | Python, Flask, Ultralytics YOLO11n, PyTorch, OpenCV |
| **XAI** | Grad-CAM (Gradient-weighted Class Activation Mapping) |
| **Bilingual** | English + Filipino (Tagalog) via i18n JSON |
| **Training** | Google Colab (GPU) — not run locally |

---

## Authors

- Justin Gie E. Santander
- Christian Ram O. Bernales
- Prince Peter T. Osorio

**Thesis Adviser**: Ms. Josephine Eduardo
