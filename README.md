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

The foundation is complete; the product itself is not built yet.

**Built:**
- Knowledge compiler (`npm run compile:knowledge`) — turns `knowledge/taxonomy.yaml` into seed
  SQL, a class index, and generated TypeScript types
- SQLite schema, migrations, and seeding, plus content repositories over the seeded tables
- A model registry that resolves which pipeline stage can run and steps down a degradation ladder
  when a stage's model is missing or under-confident
- A bare Model Status screen exercising that registry end to end

**Not built yet:**
- No trained model weights. `models/` is empty by design, and the app correctly reports
  "Detection model not installed" until training finishes
- No product UI. Camera capture, results, history, and other screens land in later phases
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

```bash
npm install
npm --prefix app install
npm run compile:knowledge
npm test        # 13 script tests + 29 app tests
npm start
```

For an installable APK, see `docs/BUILDING.md`.

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
