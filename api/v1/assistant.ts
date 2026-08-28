import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAssistant } from '../_lib/handlers/assistant';
import { clientIp, deviceIdOf, send } from '../_lib/http';
import { createRateStore } from '../_lib/rateStore';
import { createSupabaseRateClient, serviceClient } from '../_lib/supabase';

const UPSTREAM = 'https://generativelanguage.googleapis.com/v1beta/models';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return send(res, { status: 405, body: { error: 'method not allowed' } });

  const geminiKey = process.env.GEMINI_API_KEY;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Fail closed: calling upstream without a key would look like an outage.
  if (!geminiKey || !url || !serviceKey) {
    return send(res, { status: 503, body: { error: 'server not configured' } });
  }

  const model = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
  const supabase = serviceClient({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceKey });

  const result = await handleAssistant(
    {
      limiter: createRateStore(createSupabaseRateClient(supabase)),
      async ask(instruction, payload) {
        let response: Response;
        try {
          response = await fetch(`${UPSTREAM}/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: instruction }] },
              contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
            }),
          });
        } catch (cause) {
          console.error('assistant: upstream fetch failed', cause);
          return { ok: false, status: 502 };
        }

        if (!response.ok) return { ok: false, status: response.status };

        const data = (await response.json().catch(() => null)) as
          | { candidates?: { content?: { parts?: { text?: string }[] } }[] }
          | null;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text !== 'string') {
          console.error('assistant: upstream response missing text', data);
          return { ok: false, status: 502 };
        }

        try {
          return { ok: true, data: JSON.parse(text) };
        } catch (cause) {
          console.error('assistant: upstream text was not valid JSON', cause);
          return { ok: false, status: 502 };
        }
      },
    },
    req.body,
    { deviceId: deviceIdOf(req.headers), ip: clientIp(req.headers) },
  );

  send(res, result);
}
