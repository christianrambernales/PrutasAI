/**
 * Gemini call with a model fallback chain.
 *
 * Free-tier quota is per Google Cloud project, not per API key or model, but
 * each *model* still has its own daily/per-minute ceiling within that quota.
 * Advancing to the next model on a 429 spreads a single day's traffic across
 * several independent ceilings instead of stopping at the first one hit.
 *
 * Only a 429 advances the chain. Any other failure (bad request, malformed
 * upstream response, network error) is a problem a different model will not
 * fix, so it is returned immediately.
 */

import type { AskResult } from './handlers/assistant.js';

const UPSTREAM = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiAskDeps {
  apiKey: string;
  models: string[];
  fetchImpl?: typeof fetch;
}

export function createGeminiAsk(deps: GeminiAskDeps): (instruction: string, turns: { role: 'user' | 'model'; text: string }[]) => Promise<AskResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;

  return async function ask(instruction: string, turns: { role: 'user' | 'model'; text: string }[]): Promise<AskResult> {
    let last: AskResult = { ok: false, status: 502 };

    for (const model of deps.models) {
      let response: Response;
      try {
        response = await fetchImpl(`${UPSTREAM}/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': deps.apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: instruction }] },
            contents: turns.map(t => ({ role: t.role, parts: [{ text: t.text }] })),
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
        });
      } catch (cause) {
        console.error('gemini: upstream fetch failed', model, cause);
        return { ok: false, status: 502 };
      }

      if (!response.ok) {
        last = { ok: false, status: response.status };
        if (response.status === 429) continue;
        return last;
      }

      const data = (await response.json().catch(() => null)) as
        | { candidates?: { content?: { parts?: { text?: string }[] } }[] }
        | null;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string') {
        console.error('gemini: upstream response missing text', model, data);
        return { ok: false, status: 502 };
      }

      try {
        return { ok: true, data: JSON.parse(text) };
      } catch (cause) {
        console.error('gemini: upstream text was not valid JSON', model, cause);
        return { ok: false, status: 502 };
      }
    }

    return last;
  };
}
