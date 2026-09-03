import { expect, test, vi } from 'vitest';
import { createGeminiAsk } from '../_lib/gemini.js';

function geminiResponse(status: number, text?: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ candidates: [{ content: { parts: [{ text: text ?? '' }] } }] }),
  } as Response;
}

test('the primary model answers and no fallback is attempted', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async () => geminiResponse(200, '{"ok":true}'));
  const ask = createGeminiAsk({ apiKey: 'k', models: ['model-a', 'model-b'], fetchImpl });

  const result = await ask('instruction', [{ role: 'user', text: JSON.stringify({ q: 'hi' }) }]);

  expect(result).toEqual({ ok: true, data: { ok: true } });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(String(fetchImpl.mock.calls[0][0])).toContain('model-a');
});

test('a 429 from the primary model falls through to the next model', async () => {
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(geminiResponse(429))
    .mockResolvedValueOnce(geminiResponse(200, '{"ok":true}'));
  const ask = createGeminiAsk({ apiKey: 'k', models: ['model-a', 'model-b'], fetchImpl });

  const result = await ask('instruction', [{ role: 'user', text: JSON.stringify({ q: 'hi' }) }]);

  expect(result).toEqual({ ok: true, data: { ok: true } });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(String(fetchImpl.mock.calls[1][0])).toContain('model-b');
});

test('a 429 from every model in the chain propagates as 429', async () => {
  const fetchImpl = vi.fn(async () => geminiResponse(429));
  const ask = createGeminiAsk({ apiKey: 'k', models: ['model-a', 'model-b', 'model-c'], fetchImpl });

  const result = await ask('instruction', [{ role: 'user', text: JSON.stringify({ q: 'hi' }) }]);

  expect(result).toEqual({ ok: false, status: 429 });
  expect(fetchImpl).toHaveBeenCalledTimes(3);
});

test('a non-429 failure from the primary model returns immediately without trying the next model', async () => {
  const fetchImpl = vi.fn(async () => geminiResponse(400));
  const ask = createGeminiAsk({ apiKey: 'k', models: ['model-a', 'model-b'], fetchImpl });

  const result = await ask('instruction', [{ role: 'user', text: JSON.stringify({ q: 'hi' }) }]);

  expect(result).toEqual({ ok: false, status: 400 });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('a network-level throw on the primary model is treated as a 502 and does not try the next model', async () => {
  const fetchImpl = vi.fn(async () => {
    throw new Error('network down');
  });
  const ask = createGeminiAsk({ apiKey: 'k', models: ['model-a', 'model-b'], fetchImpl });

  const result = await ask('instruction', [{ role: 'user', text: JSON.stringify({ q: 'hi' }) }]);

  expect(result).toEqual({ ok: false, status: 502 });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('a response whose body is not valid JSON text becomes a 502', async () => {
  const fetchImpl = vi.fn(async () => geminiResponse(200, 'not json'));
  const ask = createGeminiAsk({ apiKey: 'k', models: ['model-a'], fetchImpl });

  const result = await ask('instruction', [{ role: 'user', text: JSON.stringify({ q: 'hi' }) }]);

  expect(result).toEqual({ ok: false, status: 502 });
});

test('sends the api key header and the instruction/payload shape Gemini expects', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async () => geminiResponse(200, '{}'));
  const ask = createGeminiAsk({ apiKey: 'secret-key', models: ['model-a'], fetchImpl });

  await ask('be helpful', [{ role: 'user', text: JSON.stringify({ question: 'hi' }) }]);

  const [, init] = fetchImpl.mock.calls[0];
  expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'secret-key' });
  const body = JSON.parse(init?.body as string);
  expect(body.systemInstruction.parts[0].text).toBe('be helpful');
  expect(JSON.parse(body.contents[0].parts[0].text)).toEqual({ question: 'hi' });
});

test('multiple turns become multiple contents entries with the right roles', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async () => geminiResponse(200, '{}'));
  const ask = createGeminiAsk({ apiKey: 'k', models: ['model-a'], fetchImpl });

  await ask('be helpful', [
    { role: 'user', text: 'first question' },
    { role: 'model', text: 'first answer' },
    { role: 'user', text: 'second question' },
  ]);

  const [, init] = fetchImpl.mock.calls[0];
  const body = JSON.parse(init?.body as string);
  expect(body.contents).toEqual([
    { role: 'user', parts: [{ text: 'first question' }] },
    { role: 'model', parts: [{ text: 'first answer' }] },
    { role: 'user', parts: [{ text: 'second question' }] },
  ]);
});

test('a single turn still works exactly as before', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async () => geminiResponse(200, '{}'));
  const ask = createGeminiAsk({ apiKey: 'k', models: ['model-a'], fetchImpl });

  await ask('be helpful', [{ role: 'user', text: 'hi' }]);

  const [, init] = fetchImpl.mock.calls[0];
  const body = JSON.parse(init?.body as string);
  expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'hi' }] }]);
});
