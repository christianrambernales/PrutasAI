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
npm run sync:models
```

`npm start` and `npm run build:apk` run both generators for you; they are listed here only
because a first checkout has neither the generated seed SQL nor the bundled-model map.

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

## Deploying the API and web build (Vercel)

`api/` and the web export both deploy from `vercel.json` at the repo root. `app/.env` is
gitignored (see [`.gitignore`](../.gitignore)), so it never reaches Vercel's build checkout —
every variable the web build needs, public or secret, has to be set as a **Vercel project
environment variable** instead. That's six variables, in three groups with different consequences
if you get them wrong:

- `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — must never reach the client bundle. A leak here
  is a shipped credential.
- `SUPABASE_URL` — server-side only, and easy to miss because its *value* is identical to
  `EXPO_PUBLIC_SUPABASE_URL`. It is a separate variable under a separate name: `api/v1/scans.ts`,
  `api/v1/claim.ts` and `api/v1/assistant.ts` each read `process.env.SUPABASE_URL`, and the
  `EXPO_PUBLIC_`-prefixed one is not visible to them. Without it every endpoint fails closed with
  **`503 {"error":"server not configured"}`** — the same response as a missing service role key.
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL` — safe to
  ship (see `app/.env`'s own comments for why), but "safe to ship" is not "gets shipped
  automatically". Expo inlines `EXPO_PUBLIC_*` values from `process.env` at build time; if Vercel
  doesn't have them set, they inline as **empty strings**, and Expo does not error on that. The
  build succeeds and the deployed site quietly stops working: an empty `EXPO_PUBLIC_API_URL`
  makes `proxy.ts` treat the assistant as unconfigured and disable it silently, and empty
  Supabase values make the Supabase client return null, silently disabling auth and history
  restore. Nothing crashes; nothing looks wrong; nothing works.

`EXPO_PUBLIC_API_URL` has a chicken-and-egg problem: its value is the deployment's own URL,
which doesn't exist until you've deployed once. Deploy in this order:

```bash
npx vercel link
npx vercel env add GEMINI_API_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel env add SUPABASE_URL           # same value as EXPO_PUBLIC_SUPABASE_URL, different name
npx vercel env add EXPO_PUBLIC_SUPABASE_URL
npx vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY
npx vercel deploy --prod          # first deploy — EXPO_PUBLIC_API_URL still unset
# read the URL Vercel just assigned, e.g. https://prutasai.vercel.app
npx vercel env add EXPO_PUBLIC_API_URL   # value: https://prutasai.vercel.app/api
npx vercel deploy --prod          # redeploy so the value is actually inlined into the bundle
```

The first deploy is not wasted: it's what tells you the URL to put in `EXPO_PUBLIC_API_URL`. The
second deploy is required, not optional — setting the env var alone does not touch the already-
built bundle sitting in Vercel; only a fresh build inlines the new value.

Neither `GEMINI_API_KEY` nor `SUPABASE_SERVICE_ROLE_KEY` is ever written to a file in the repo or
to git — both live only as Vercel project environment variables, set once through the CLI above
or the Vercel dashboard. Get a Gemini key from
[Google AI Studio](https://aistudio.google.com/apikey); the model name is the `GEMINI_MODEL` env
var, overridable in the dashboard without an app rebuild. The Supabase service role key comes
from the Supabase dashboard (Project Settings → API) and is what lets `api/` write past
row-level security — never ship it to the app.

`vercel.json` also sets two response headers on every route:

```json
"headers": [
  { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
  { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
]
```

These are not decoration. `expo-sqlite`'s web backend uses OPFS, which browsers only expose to a
cross-origin-isolated page. Without both headers the web bundle still loads and looks correct —
it just silently fails to open the database, so browsing, history and climate quietly stop
persisting with no visible error. `require-corp` also blocks any cross-origin subresource that
doesn't send its own CORP header; the app loads none today, so this is inert until someone adds
one, at which point it fails loudly rather than the database failing silently. Don't remove this
header to fix that failure — give the new resource a CORP header instead.

**Web session storage.** Signing in stores the Supabase session token in `expo-secure-store` on
Android and iOS. The web build has no secure storage API to fall back to, so on web the token
sits in `localStorage`, readable by any script running on the origin. That's an accepted
trade-off here — the rows behind it are anonymous agronomy records, not personal data — but a
future reader relying on the token as a secret on web should know it is not one.

## Optional: the AI assistant

The assistant answers from the bundled knowledge base with no network and no key. Leave
`GEMINI_API_KEY` unset on Vercel and every grounded answer still works, fully offline.

Turning it on adds two things: a **general tier** that answers open crop and plant-health
questions, always labelled "Not from the knowledge base" in the chat bubble; and online
rewording of grounded answers, where the model may only *reword* something the app already
computed and never decides a fact.

**No credential goes in the app.** Expo inlines every `EXPO_PUBLIC_*` variable into the JS
bundle at build time, so anything in `app/.env` is extractable from a shipped APK with a text
editor. This build shipped a live Gemini key that way once; it does not any more. The key lives
as a Vercel environment variable read by the API in `api/` (see above), and the app knows only a
public URL.

Point the app at the deployed API in `app/.env` (gitignored):

```
EXPO_PUBLIC_API_URL=https://<your-deployment>.vercel.app/api
```

This is the native-app config point — Metro reads `app/.env` when you run the app locally or
build an APK. It has no effect on the web build; for that, `EXPO_PUBLIC_API_URL` (and the two
Supabase variables) must also be set as Vercel project environment variables, per "Deploying the
API and web build" above.

Restart Metro with the cache cleared — Expo inlines env vars at bundle time, so a warm cache
keeps serving the old value:

```bash
npx expo start -c
```

Finally turn on **Settings → Assistant → AI assistant**.

The API rate-limits per device and per IP (`api/_lib/limits.ts`), backed by a Postgres table in
Supabase, so one install cannot exhaust the shared quota. The device id it uses is a random
per-install string kept in the local `setting` table — a rate-limit key, not authentication, and
it carries nothing about the device or the person.

### What the guards still guarantee

Grounded answers keep every check they had (`app/src/core/chat/providers/guard.ts`). Two run on
every rewording, and a failure of either silently falls back to the curated wording:

1. The reworded answer must echo the computed verdict unchanged.
2. Every number in it must already appear in the supplied facts — this is what stops an invented
   dosage or rainfall figure reaching a farmer.

General-tier answers have no facts to check against, so no numeric guard applies to them. Three
rules hold instead:

- The visible "General guidance · Not from the knowledge base" caveat is part of the bubble, so
  it cannot be mistaken for a grounded answer.
- An off-topic question shows the app's own refusal wording. The model's text is discarded, so a
  refusal cannot smuggle an answer through.
- A network error, timeout, 429 or 5xx produces a visible notice. Nothing is ever invented to
  fill the gap.

## Troubleshooting

**`SDK location not found`** — set `ANDROID_HOME`, or create `app/android/local.properties`
containing `sdk.dir=/path/to/Android/sdk`.

**`Unsupported class file major version`** — you are on the wrong JDK. Confirm with
`java -version`; it must report 17.

**Build produces `.aab` instead of `.apk`** — the EAS profile is missing
`"android": { "buildType": "apk" }`.

**App shows "Detection model not installed"** — correct behaviour when `models/` is empty. A
photo you take is shown back to you with that message rather than a guessed variety or disease.

**Camera preview is black** — permission was refused. The screen offers "Open settings" once
Android stops allowing a re-prompt.
