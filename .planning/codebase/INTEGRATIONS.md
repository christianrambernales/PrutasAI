---
mapped_at: 2026-09-15
---

# Integrations

## Supabase

- `app/src/core/auth/supabase.ts` creates the client-side auth connection.
- `api/_lib/supabase.ts` creates a non-persistent service-role client for server-side inserts, reads, deletes, and rate tracking.
- Database schema and RLS policies are versioned in `supabase/migrations/`.
- Cloud data includes `scan`, `profile`, `conversation`, `conversation_message`, and `rate_hit` records.
- The app queues metadata locally and drains it through `api/v1/scans.ts`, `api/v1/conversations.ts`, and `api/v1/conversation-messages.ts`.

## Google Gemini

- `api/_lib/gemini.ts` calls the Generative Language API through a model fallback chain.
- `api/_lib/handlers/assistant.ts` validates and rate-limits requests before invoking Gemini.
- `app/src/core/chat/providers/proxy.ts` calls the configured Vercel proxy; no Gemini key is shipped to the app.
- `app/src/core/chat/providers/guard.ts` rejects rephrasing that changes guarded verdicts or numerical claims.

## Open-Meteo

- `app/src/core/climate/` retrieves weather/climate data and caches it locally.
- `app/src/features/climate/` renders current readings, historical normals, and suitability evidence.
- Location is selected or acquired through `app/src/features/location/` and rounded before persistence/use.

## Device and platform services

- Camera and image selection are integrated through Expo modules in `app/src/features/capture/`.
- Coarse foreground location uses `expo-location`; secure credentials/session material uses `expo-secure-store`.
- Local SQLite is the primary persistence layer, with migration/seed logic in `app/src/core/db/`.
- Vercel hosts the web export and API functions; `vercel.json` enforces COOP/COEP for SQLite on web.

## Integration boundaries

- Offline diagnosis, knowledge lookup, chat intent matching, and local history remain usable without network access.
- Cloud sync is optional and user/account gated; image files are not sent by the scan drain.
- External service failures are represented as unavailable/stale states rather than silently replaced with fabricated results.
