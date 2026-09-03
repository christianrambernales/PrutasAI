import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAssistant } from '../_lib/handlers/assistant.js';
import { createGeminiAsk } from '../_lib/gemini.js';
import { clientIp, deviceIdOf, send } from '../_lib/http.js';
import { createRateStore } from '../_lib/rateStore.js';
import { createSupabaseRateClient, serviceClient } from '../_lib/supabase.js';

// Ordered by free-tier daily ceiling, richest first. A 429 on one model
// advances to the next rather than failing the request, because each model
// carries its own ceiling within the project's shared quota.
const DEFAULT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return send(res, { status: 405, body: { error: 'method not allowed' } });

  const geminiKey = process.env.GEMINI_API_KEY;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Fail closed: calling upstream without a key would look like an outage.
  if (!geminiKey || !url || !serviceKey) {
    return send(res, { status: 503, body: { error: 'server not configured' } });
  }

  const models = process.env.GEMINI_MODELS
    ? process.env.GEMINI_MODELS.split(',').map(m => m.trim()).filter(Boolean)
    : DEFAULT_MODELS;
  const supabase = serviceClient({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceKey });

  const result = await handleAssistant(
    {
      limiter: createRateStore(createSupabaseRateClient(supabase)),
      ask: createGeminiAsk({ apiKey: geminiKey, models }),
    },
    req.body,
    { deviceId: deviceIdOf(req.headers), ip: clientIp(req.headers) },
  );

  send(res, result);
}
