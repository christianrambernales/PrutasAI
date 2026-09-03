import type { GroundedAnswer } from '../answer';
import { createProxyProvider } from '../providers/proxy';

const BASE = 'https://api.example.workers.dev';

const ANSWER: GroundedAnswer = {
  intent: 'crop_suitability',
  text: 'Potentially suitable — Banana, Los Baños.\nAnnual rainfall: 2,930 mm (optimal 1,800–2,600 mm)',
  facts: ['Potentially suitable', 'Banana', 'Los Baños', '2,930 mm', 'optimal 1,800–2,600 mm'],
  verdict: 'potentially_suitable',
  sources: ['Open-Meteo'],
};

function provider(fetchImpl: unknown, extra: Record<string, unknown> = {}) {
  return createProxyProvider({
    baseUrl: BASE,
    deviceId: 'dev-1',
    fetchImpl: fetchImpl as typeof fetch,
    ...extra,
  });
}

const reply = (body: unknown, status = 200) =>
  (async () => ({ ok: status < 400, status, json: async () => body })) as unknown as typeof fetch;

// --- the general tier -------------------------------------------------------

test('a general answer is returned with its topic flag', async () => {
  const p = provider(reply({ on_topic: true, text: 'Remove infected fruit.' }));
  const answer = await p.answerGeneral('How do I control anthracnose?', 'ctx');
  expect(answer.onTopic).toBe(true);
  expect(answer.text).toBe('Remove infected fruit.');
  expect(answer.error).toBeNull();
});

test('an off-topic question yields a refusal and discards the model text', async () => {
  const p = provider(reply({ on_topic: false, text: 'The election was won by...' }));
  const answer = await p.answerGeneral('Who won the election?', 'ctx');
  expect(answer.onTopic).toBe(false);
  expect(answer.text).toBe('');
  expect(answer.text).not.toContain('election was won');
});

test('no API key is ever sent — only the device id', async () => {
  let headers: Record<string, string> = {};
  const p = provider((async (_u: string, init: { headers: Record<string, string> }) => {
    headers = init.headers;
    return { ok: true, status: 200, json: async () => ({ on_topic: true, text: 'ok' }) };
  }) as unknown as typeof fetch);
  await p.answerGeneral('q', 'ctx');

  expect(headers['X-Device-Id']).toBe('dev-1');
  expect(Object.keys(headers).join(' ').toLowerCase()).not.toContain('api-key');
  expect(JSON.stringify(headers).toLowerCase()).not.toContain('aiza');
});

test('the question and the context are what the proxy is asked about', async () => {
  let sentUrl = '';
  let sentBody = '';
  const p = provider((async (url: string, init: { body: string }) => {
    sentUrl = url;
    sentBody = init.body;
    return { ok: true, status: 200, json: async () => ({ on_topic: true, text: 'ok' }) };
  }) as unknown as typeof fetch);
  await p.answerGeneral('How do I control anthracnose?', 'Grower is in Bacoor.');

  expect(sentUrl).toBe(`${BASE}/v1/assistant`);
  // Never Google directly: the whole point is that the key is not on the device.
  expect(sentUrl).not.toContain('generativelanguage');
  expect(JSON.parse(sentBody)).toEqual({
    mode: 'general',
    question: 'How do I control anthracnose?',
    context: 'Grower is in Bacoor.',
  });
});

test('a rate limit is reported rather than swallowed', async () => {
  const p = provider(reply({ error: 'rate limited' }, 429));
  const answer = await p.answerGeneral('q', 'ctx');
  expect(answer.onTopic).toBe(false);
  expect(answer.text).toBe('');
  expect(answer.error).toContain('too many');
  expect(answer.errorKind).toBe('rateLimited');
});

test('a 5xx reports an error, never a fabricated answer', async () => {
  const p = provider(reply({ error: 'upstream unavailable' }, 502));
  const answer = await p.answerGeneral('q', 'ctx');
  expect(answer.text).toBe('');
  expect(answer.errorKind).toBe('unavailable');
});

test('an unreachable proxy reports an error, never a fabricated answer', async () => {
  const p = provider((async () => { throw new Error('offline'); }) as unknown as typeof fetch);
  const answer = await p.answerGeneral('q', 'ctx');
  expect(answer.error).toBeTruthy();
  expect(answer.errorKind).toBe('unreachable');
  expect(answer.text).toBe('');
});

test('a timeout reports an error rather than hanging or inventing one', async () => {
  const p = provider(
    (async (_u: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      })) as unknown as typeof fetch,
    { timeoutMs: 10 },
  );
  const answer = await p.answerGeneral('q', 'ctx');
  expect(answer.text).toBe('');
  expect(answer.errorKind).toBe('unreachable');
});

test('an unconfigured proxy says so instead of appearing to work', async () => {
  let called = false;
  const p = createProxyProvider({
    baseUrl: '   ',
    deviceId: 'dev-1',
    fetchImpl: (async () => { called = true; throw new Error('should not be called'); }) as unknown as typeof fetch,
  });
  expect(p.isAvailable()).toBe(false);

  const answer = await p.answerGeneral('q', 'ctx');
  expect(answer.errorKind).toBe('unconfigured');
  expect(answer.text).toBe('');
  expect(called).toBe(false);
});

test('a malformed body is an error, not an empty on-topic answer', async () => {
  const p = provider(reply({ on_topic: true }));
  const answer = await p.answerGeneral('q', 'ctx');
  expect(answer.text).toBe('');
  expect(answer.errorKind).toBe('unavailable');
});

test('history is included in the request body when provided', async () => {
  let sentBody: unknown;
  const fetchImpl = jest.fn(async (_url: string, init: RequestInit) => {
    sentBody = JSON.parse(init.body as string);
    return new Response(JSON.stringify({ on_topic: true, text: 'ok' }), { status: 200 });
  }) as unknown as typeof fetch;
  const provider = createProxyProvider({ baseUrl: BASE, deviceId: 'dev-1', fetchImpl });

  await provider.answerGeneral('second question', '', [
    { role: 'user', text: 'first question' },
    { role: 'assistant', text: 'first answer' },
  ]);

  expect(sentBody).toMatchObject({
    mode: 'general',
    question: 'second question',
    history: [{ role: 'user', text: 'first question' }, { role: 'assistant', text: 'first answer' }],
  });
});

test('an absent history is simply omitted from the body', async () => {
  let sentBody: Record<string, unknown> = {};
  const fetchImpl = jest.fn(async (_url: string, init: RequestInit) => {
    sentBody = JSON.parse(init.body as string);
    return new Response(JSON.stringify({ on_topic: true, text: 'ok' }), { status: 200 });
  }) as unknown as typeof fetch;
  const provider = createProxyProvider({ baseUrl: BASE, deviceId: 'dev-1', fetchImpl });

  await provider.answerGeneral('hi', '');

  expect(sentBody.history).toBeUndefined();
});

// --- the grounded tier, guards unchanged ------------------------------------

test('rephrase still passes the grounded guards', async () => {
  const p = provider(reply({ text: 'Banana suits this area.', verdict_echo: 'potentially_suitable' }));
  await expect(p.rephrase(ANSWER)).resolves.toBe('Banana suits this area.');
});

test('a rephrase that changes the verdict falls back to curated wording', async () => {
  const p = provider(reply({ text: 'Perfect!', verdict_echo: 'suitable' }));
  await expect(p.rephrase(ANSWER)).resolves.toBe(ANSWER.text);
});

test('a rephrase that invents a number falls back to curated wording', async () => {
  const p = provider(reply({ text: 'Rainfall reaches 5,000 mm.', verdict_echo: 'potentially_suitable' }));
  await expect(p.rephrase(ANSWER)).resolves.toBe(ANSWER.text);
});

test('a rephrase that reuses the supplied numbers is allowed through', async () => {
  const p = provider(
    reply({ text: 'Rainfall is 2,930 mm against an optimal 1,800–2,600 mm.', verdict_echo: 'potentially_suitable' }),
  );
  await expect(p.rephrase(ANSWER)).resolves.toBe(
    'Rainfall is 2,930 mm against an optimal 1,800–2,600 mm.',
  );
});

test('an empty rephrase falls back to curated wording', async () => {
  const p = provider(reply({ text: '   ', verdict_echo: 'potentially_suitable' }));
  await expect(p.rephrase(ANSWER)).resolves.toBe(ANSWER.text);
});

test('a rephrase network error falls back to curated wording', async () => {
  const p = provider((async () => { throw new Error('offline'); }) as unknown as typeof fetch);
  await expect(p.rephrase(ANSWER)).resolves.toBe(ANSWER.text);
});

test('an HTTP error on rephrase falls back to curated wording', async () => {
  const p = provider(reply({ error: 'quota exhausted' }, 429));
  await expect(p.rephrase(ANSWER)).resolves.toBe(ANSWER.text);
});

test('an unparseable rephrase body falls back to curated wording', async () => {
  const p = provider(
    (async () => ({ ok: true, status: 200, json: async () => { throw new Error('not json'); } })) as unknown as typeof fetch,
  );
  await expect(p.rephrase(ANSWER)).resolves.toBe(ANSWER.text);
});

test('rephrase sends only the facts and the verdict, never the raw question', async () => {
  let sentBody = '';
  const p = provider((async (_u: string, init: { body: string }) => {
    sentBody = init.body;
    return {
      ok: true,
      status: 200,
      json: async () => ({ text: 'ok', verdict_echo: 'potentially_suitable' }),
    };
  }) as unknown as typeof fetch);
  await p.rephrase(ANSWER);

  const sent = JSON.parse(sentBody);
  expect(sent.mode).toBe('rephrase');
  expect(sent.verdict).toBe('potentially_suitable');
  expect(sent.facts).toContain('2,930 mm');
  expect(sent.question).toBeUndefined();
});

test('an unconfigured proxy rephrases to the curated wording without a request', async () => {
  let called = false;
  const p = createProxyProvider({
    baseUrl: '',
    deviceId: 'dev-1',
    fetchImpl: (async () => { called = true; throw new Error('should not be called'); }) as unknown as typeof fetch,
  });
  await expect(p.rephrase(ANSWER)).resolves.toBe(ANSWER.text);
  expect(called).toBe(false);
});

// --- diagnostics ------------------------------------------------------------

test('a transport failure on rephrase is reported, not swallowed', async () => {
  const seen: string[] = [];
  const p = provider((async () => { throw new Error('offline'); }) as unknown as typeof fetch, {
    onDiagnostic: (m: string) => seen.push(m),
  });
  await p.rephrase(ANSWER);
  expect(seen).toHaveLength(1);
});

test('an HTTP failure on rephrase is reported with its status', async () => {
  const seen: string[] = [];
  const p = provider(reply({ error: 'upstream error' }, 502), {
    onDiagnostic: (m: string) => seen.push(m),
  });
  await p.rephrase(ANSWER);
  expect(seen).toHaveLength(1);
  expect(seen[0]).toContain('502');
});

test('a guard rejection stays silent — that is the safety net working, not a fault', async () => {
  const seen: string[] = [];
  const p = provider(reply({ text: 'Rainfall is 9,999 mm.', verdict_echo: 'potentially_suitable' }), {
    onDiagnostic: (m: string) => seen.push(m),
  });
  await expect(p.rephrase(ANSWER)).resolves.toBe(ANSWER.text);
  expect(seen).toEqual([]);
});

test('a successful rephrase reports nothing', async () => {
  const seen: string[] = [];
  const p = provider(reply({ text: 'Banana suits this area.', verdict_echo: 'potentially_suitable' }), {
    onDiagnostic: (m: string) => seen.push(m),
  });
  await expect(p.rephrase(ANSWER)).resolves.toBe('Banana suits this area.');
  expect(seen).toEqual([]);
});
