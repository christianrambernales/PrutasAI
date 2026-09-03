/**
 * The guard and the offline provider.
 *
 * The remote provider's own tests live in proxy.test.ts. There used to be a
 * Gemini provider here that held an API key in the app; it was deleted, and
 * every guard, fallback and diagnostic case it covered was moved into that
 * file rather than dropped.
 */

import type { GroundedAnswer } from '../answer';
import { guardRephrasing } from '../providers/guard';
import { templateProvider } from '../providers/template';

const ANSWER: GroundedAnswer = {
  intent: 'crop_suitability',
  text: 'Potentially suitable — Banana, Los Baños.\nAnnual rainfall: 2,930 mm (optimal 1,800–2,600 mm)',
  facts: ['Potentially suitable', 'Banana', 'Los Baños', '2,930 mm', 'optimal 1,800–2,600 mm'],
  verdict: 'potentially_suitable',
  sources: ['Open-Meteo'],
};

// --- the guard --------------------------------------------------------------

test('a faithful rewording passes', () => {
  const out = guardRephrasing(
    { text: 'Banana is potentially suitable for Los Baños.', verdict_echo: 'potentially_suitable' },
    ANSWER,
  );
  expect(out).toBe('Banana is potentially suitable for Los Baños.');
});

test('a rewording that reuses the supplied numbers passes', () => {
  const out = guardRephrasing(
    { text: 'Rainfall is 2,930 mm against an optimal 1,800–2,600 mm.', verdict_echo: 'potentially_suitable' },
    ANSWER,
  );
  expect(out).not.toBeNull();
});

test('a changed verdict is discarded', () => {
  expect(
    guardRephrasing({ text: 'Banana grows well here.', verdict_echo: 'suitable' }, ANSWER),
  ).toBeNull();
});

test('a number that was never supplied is discarded', () => {
  expect(
    guardRephrasing(
      { text: 'Rainfall is 4,100 mm, well above optimal.', verdict_echo: 'potentially_suitable' },
      ANSWER,
    ),
  ).toBeNull();
});

test('an invented dosage is discarded', () => {
  expect(
    guardRephrasing(
      { text: 'Spray 25 ml per litre every 14 days.', verdict_echo: 'potentially_suitable' },
      ANSWER,
    ),
  ).toBeNull();
});

test('an empty rewording is discarded', () => {
  expect(guardRephrasing({ text: '   ', verdict_echo: 'potentially_suitable' }, ANSWER)).toBeNull();
});

test('a missing verdict echo is discarded when a verdict was computed', () => {
  expect(guardRephrasing({ text: 'Looks fine.', verdict_echo: null }, ANSWER)).toBeNull();
});

test('an answer with no verdict needs no echo', () => {
  const noVerdict: GroundedAnswer = { ...ANSWER, verdict: null };
  expect(
    guardRephrasing({ text: 'The knowledge base has no rows for that.', verdict_echo: null }, noVerdict),
  ).not.toBeNull();
});

// --- template provider ------------------------------------------------------

test('the template provider is always available and returns the curated text', async () => {
  expect(templateProvider.isAvailable()).toBe(true);
  await expect(templateProvider.rephrase(ANSWER)).resolves.toBe(ANSWER.text);
});

test('the template provider is not remote, so the general tier never routes to it', () => {
  expect(templateProvider.remote).toBe(false);
});

test('the template provider answers no open question rather than inventing one', async () => {
  const answer = await templateProvider.answerGeneral('How do I control anthracnose?', 'ctx');
  expect(answer.text).toBe('');
  expect(answer.onTopic).toBe(false);
  expect(answer.errorKind).toBe('unconfigured');
});
