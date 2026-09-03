/**
 * The two tiers, through the real hook.
 *
 * The invariants under test are the ones that matter if the model misbehaves:
 * a refusal may not carry an answer, a failure may not become one, and the
 * grounded path must not change at all.
 */

import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import type { ChatContext } from '../../core/chat/answer';
import type { ChatProvider, GeneralAnswer } from '../../core/chat/providers/types';
import { templateProvider } from '../../core/chat/providers/template';
import { useChat } from '../chat/useChat';
import { freshDb } from '../../core/db/testing/scanFixtures';
import * as preview from '../../preview/previewContent';

const CONTEXT: ChatContext = {
  language: 'EN',
  fruits: preview.FRUITS,
  varietiesByFruit: preview.VARIETIES_BY_FRUIT,
  strainsByFruit: preview.STRAINS_BY_FRUIT,
  sourcesByFruit: preview.SOURCES_BY_FRUIT,
  climate: null,
  climateReady: false,
  suitabilityFor: () => null,
  location: null,
  detection: { headline: 'No models installed', detail: 'Nothing can be identified.', depth: 0 },
};

type Chat = ReturnType<typeof useChat>;

/** Renders the hook and hands back a live handle to its return value. */
function mount(provider: ChatProvider): { chat: () => Chat } {
  let latest!: Chat;
  // Each mount gets its own database: these tests assert on hook state, not
  // on persistence, and a fresh store keeps one test's conversation rows from
  // leaking into the next.
  const db = freshDb();
  function Probe() {
    latest = useChat(CONTEXT, provider, db);
    return null;
  }
  act(() => {
    renderer.create(<Probe />) as ReactTestRenderer;
  });
  return { chat: () => latest };
}

function remote(answerGeneral: ChatProvider['answerGeneral']): ChatProvider {
  return {
    id: 'test-remote',
    remote: true,
    isAvailable: () => true,
    rephrase: async answer => answer.text,
    answerGeneral,
  };
}

const general = (body: Partial<GeneralAnswer>): GeneralAnswer => ({
  onTopic: false,
  text: '',
  error: null,
  errorKind: null,
  ...body,
});

async function ask(handle: { chat: () => Chat }, question: string) {
  await act(async () => {
    handle.chat().ask(question);
  });
}

test('a knowledge-base question is answered from the knowledge base, unchanged', async () => {
  let generalCalls = 0;
  const handle = mount(
    remote(async () => {
      generalCalls += 1;
      return general({ onTopic: true, text: 'model text' });
    }),
  );

  await ask(handle, 'What varieties of mango are there?');

  const reply = handle.chat().messages[1];
  expect(reply.kind).toBe('grounded');
  expect(reply.text).toContain('Carabao');
  // The general tier must never be consulted for a grounded question.
  expect(generalCalls).toBe(0);
});

test('an open crop question is answered and labelled as general guidance', async () => {
  const handle = mount(remote(async () => general({ onTopic: true, text: 'Remove infected fruit.' })));

  await ask(handle, 'How do I control anthracnose?');

  const reply = handle.chat().messages[1];
  expect(reply.kind).toBe('general');
  expect(reply.text).toBe('Remove infected fruit.');
});

test('an off-topic answer is replaced by the app refusal, never the model text', async () => {
  const handle = mount(
    remote(async () => general({ onTopic: false, text: 'The election was won by...' })),
  );

  await ask(handle, 'Who won the election?');

  const reply = handle.chat().messages[1];
  expect(reply.kind).toBe('refusal');
  expect(reply.text).not.toContain('election');
  expect(reply.text).toContain('crops and plant health');
});

test('an unreachable assistant produces a notice, never a fabricated answer', async () => {
  const handle = mount(
    remote(async () =>
      general({ error: 'Could not reach the assistant.', errorKind: 'unreachable' }),
    ),
  );

  await ask(handle, 'How do I control anthracnose?');

  const reply = handle.chat().messages[1];
  expect(reply.kind).toBe('notice');
  expect(reply.text).toContain('Could not reach');
});

test('a rate limit is reported in the user language, not swallowed', async () => {
  const handle = mount(remote(async () => general({ error: 'x', errorKind: 'rateLimited' })));

  await ask(handle, 'How do I control anthracnose?');

  expect(handle.chat().messages[1].kind).toBe('notice');
  expect(handle.chat().messages[1].text).toContain('too many questions');
});

test('with the assistant off, an open question says so instead of failing quietly', async () => {
  const handle = mount(templateProvider);

  await ask(handle, 'How do I control anthracnose?');

  const messages = handle.chat().messages;
  expect(messages[0].role).toBe('user');
  expect(messages[1].kind).toBe('notice');
  expect(messages[1].text).toContain('Turn it on in Settings');
});

test('with the assistant off, grounded questions still answer offline', async () => {
  const handle = mount(templateProvider);

  await ask(handle, 'What varieties of mango are there?');

  expect(handle.chat().messages[1].kind).toBe('grounded');
  expect(handle.chat().messages[1].text).toContain('Carabao');
});

test('the model never sees the raw question on the grounded path', async () => {
  const seen: string[] = [];
  const provider: ChatProvider = {
    id: 'spy',
    remote: true,
    isAvailable: () => true,
    rephrase: async answer => {
      seen.push(JSON.stringify(answer.facts));
      return answer.text;
    },
    answerGeneral: async () => general({}),
  };
  const handle = mount(provider);

  await ask(handle, 'What varieties of mango are there?');

  expect(seen).toHaveLength(1);
  expect(seen[0]).not.toContain('What varieties');
});
