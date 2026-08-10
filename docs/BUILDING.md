# Building the PrutasAI APK

The app builds, installs, and runs with no model weights present. This is the expected state
until training finishes.

## Prerequisites

- Node.js 20 or newer
- JDK 17 (required by the Android Gradle Plugin)
- Android SDK with platform-tools on `PATH` (for the local route)
- An Expo account (only for the EAS route)

## First-time setup

```bash
npm install
npm --prefix app install
npm run compile:knowledge
```

## Build locally, no account or network needed

```bash
npm run build:apk
```

Output: `app/android/app/build/outputs/apk/release/app-release.apk`

## Build with EAS, no Android SDK needed

```bash
cd app
eas build -p android --profile preview
```

The `preview` profile sets `buildType: apk`. Without it EAS emits an `.aab`, which cannot be
sideloaded onto a device.

## Install

```bash
adb install -r app/android/app/build/outputs/apk/release/app-release.apk
```

## Adding trained model weights

1. Copy the `.tflite` file into `models/`.
2. Compute its checksum:
   - Linux/macOS: `sha256sum models/<file>.tflite`
   - Windows: `certutil -hashfile models\<file>.tflite SHA256`
3. Add an entry to `models/manifest.json` with the filename, checksum, stage, version, and
   `min_confidence`.
4. Rebuild. `npm start` and `npm run build:apk` both sync `models/` into the app bundle
   automatically.

## Troubleshooting

**`SDK location not found`** — set `ANDROID_HOME`, or create `app/android/local.properties`
containing `sdk.dir=/path/to/Android/sdk`.

**`Unsupported class file major version`** — you are on the wrong JDK. Confirm with
`java -version`; it must report 17.

**Build produces `.aab` instead of `.apk`** — the EAS profile is missing
`"android": { "buildType": "apk" }`.

**App shows "Detection model not installed"** — correct behaviour when `models/` is empty.
