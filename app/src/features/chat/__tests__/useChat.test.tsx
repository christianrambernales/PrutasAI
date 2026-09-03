/**
 * `useChat`'s persisted-conversation lifecycle: a conversation is created on
 * first send, every message is persisted, and later questions in the same
 * conversation carry the prior turns as history — but never the question
 * currently being asked, since that row is already in the database by the
 * time history is read back out.
 *
 * The two-tier routing itself (grounded vs. general) is already covered by
 * `assistantTiers.test.tsx`; every question here is phrased to land on the
 * general tier, since that is the only path that touches history.
 */

import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { useChat } from '../useChat';
import { freshDb } from '../../../core/db/testing/scanFixtures';
import {
  insertConversation, insertMessage, listActiveConversations, listMessages,
} from '../../../core/db/repositories/conversations';
import * as preview from '../../../preview/previewContent';
import type { ChatContext } from '../../../core/chat/answer';
import type { ChatProvider, HistoryTurn } from '../../../core/chat/providers/types';

const CONTEXT: ChatContext = {
  language: 'EN',
  fruits: [],
  varietiesByFruit: {},
  strainsByFruit: {},
  sourcesByFruit: {},
  climate: null,
  climateReady: false,
  suitabilityFor: () => null,
  location: null,
  detection: { headline: '', detail: '', depth: 0 },
};

/**
 * The same context with the bundled knowledge base attached, so a question
 * can route to the grounded tier. `CONTEXT` above is deliberately empty:
 * every question against it lands on the general tier.
 */
const GROUNDED_CONTEXT: ChatContext = {
  ...CONTEXT,
  fruits: preview.FRUITS,
  varietiesByFruit: preview.VARIETIES_BY_FRUIT,
  strainsByFruit: preview.STRAINS_BY_FRUIT,
  sourcesByFruit: preview.SOURCES_BY_FRUIT,
};

function fakeProvider(overrides: Partial<ChatProvider> = {}): ChatProvider {
  return {
    id: 'fake',
    remote: true,
    isAvailable: () => true,
    rephrase: async a => a.text,
    answerGeneral: async () => ({ onTopic: true, text: 'answer', error: null, errorKind: null }),
    ...overrides,
  };
}

function harness(
  db: ReturnType<typeof freshDb>,
  provider: ChatProvider,
  context: ChatContext = CONTEXT,
  onPersisted?: () => void,
) {
  let hook!: ReturnType<typeof useChat>;
  function Harness() {
    hook = useChat(context, provider, db, 'device', onPersisted);
    return null;
  }
  act(() => {
    renderer.create(<Harness />);
  });
  return {
    get current() {
      return hook;
    },
  };
}

/**
 * `setDraft` then `send()` cannot be one synchronous step: `send` is a
 * `useCallback` memoized on the current `draft`, so calling it in the same
 * tick as `setDraft` still closes over the *previous* (empty) draft — nothing
 * gets sent. Each step gets its own `act` boundary so the draft update
 * commits and `send` is re-memoized before it runs; the final `act` gives the
 * provider's promise chain a turn to resolve before the caller inspects state.
 */
async function sendMessage(h: ReturnType<typeof harness>, text: string): Promise<void> {
  act(() => { h.current.setDraft(text); });
  await act(async () => { h.current.send(); });
  await act(async () => { await Promise.resolve(); });
}

test('sending the first message creates a conversation and persists both turns', async () => {
  const db = freshDb();
  const h = harness(db, fakeProvider());

  await sendMessage(h, 'How do I care for a banana plant?');

  const active = listActiveConversations(db);
  expect(active).toHaveLength(1);
  expect(active[0].title).toContain('How do I care for a banana plant');
  const messages = listMessages(db, active[0].uuid);
  expect(messages).toHaveLength(2);
  expect(messages[0].role).toBe('user');
  expect(messages[1].role).toBe('assistant');
});

// Requirement carried in from outside the brief: `answerGeneral`'s `history`
// parameter is optional, and an empty history must be left out of the call
// rather than passed as `[]` — this is the only test that pins that down.
test('a first question omits the history argument entirely', async () => {
  const db = freshDb();
  const answerGeneral = jest.fn(async () => (
    { onTopic: true, text: 'answer', error: null, errorKind: null }
  ));
  const h = harness(db, fakeProvider({ answerGeneral }));

  await sendMessage(h, 'How do I care for a banana plant?');

  expect(answerGeneral).toHaveBeenCalledTimes(1);
  expect(answerGeneral.mock.calls[0]).toHaveLength(2);
});

test('a second question in the same conversation sends the first exchange as history', async () => {
  const db = freshDb();
  // The default resolves every call to 'second answer'; overridden once so the
  // *first* turn's persisted reply is 'answer' — what the history assertion
  // below expects that turn to have said. Typed with the real parameter list
  // (rather than left as the zero-arg `async () => ...` shorthand) so
  // `mock.calls[n]` is a 3-element tuple and the destructure below type-checks.
  const answerGeneral = jest.fn(async (_q: string, _c: string, _h?: HistoryTurn[]) => (
    { onTopic: true, text: 'second answer', error: null, errorKind: null }
  ));
  answerGeneral.mockResolvedValueOnce({ onTopic: true, text: 'answer', error: null, errorKind: null });
  const h = harness(db, fakeProvider({ answerGeneral }));

  await sendMessage(h, 'first question');
  await sendMessage(h, 'second question');

  const [, , history] = answerGeneral.mock.calls[1];
  expect(history).toEqual([
    { role: 'user', text: 'first question' },
    { role: 'assistant', text: 'answer' },
  ]);
});

test('startNewConversation clears messages and the active conversation id', async () => {
  const db = freshDb();
  const h = harness(db, fakeProvider());
  await sendMessage(h, 'hi');

  act(() => { h.current.startNewConversation(); });

  expect(h.current.messages).toHaveLength(0);
  expect(h.current.conversationId).toBeNull();
});

test('openConversation loads a past conversation\'s messages', async () => {
  const db = freshDb();
  const h = harness(db, fakeProvider());
  await sendMessage(h, 'hi');
  const savedId = h.current.conversationId!;
  act(() => { h.current.startNewConversation(); });

  act(() => { h.current.openConversation(savedId); });

  expect(h.current.conversationId).toBe(savedId);
  expect(h.current.messages).toHaveLength(2);
});

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Message ids are the sync key and the local primary key at once, so a
 * counter fails twice over: the endpoint rejects a non-UUID with a 400 that
 * the drain records as permanently accepted, and the counter restarting at
 * zero on the next launch collides with rows already stored, which
 * `INSERT OR IGNORE` drops without a word.
 */
test('every persisted message id is a v4 uuid', async () => {
  const db = freshDb();
  const h = harness(db, fakeProvider());

  await sendMessage(h, 'first question');
  await sendMessage(h, 'second question');

  const conversationId = listActiveConversations(db)[0].uuid;
  const stored = listMessages(db, conversationId);
  expect(stored).toHaveLength(4);
  stored.forEach(m => expect(m.uuid).toMatch(UUID_V4));
  expect(new Set(stored.map(m => m.uuid)).size).toBe(4);
});

test('ids minted on a later mount do not collide with ones already stored', async () => {
  const db = freshDb();
  await sendMessage(harness(db, fakeProvider()), 'first launch question');
  const conversationId = listActiveConversations(db)[0].uuid;

  // A second mount is the test's stand-in for a second app launch: whatever
  // seeds the id must not restart from a value already used.
  const second = harness(db, fakeProvider());
  act(() => { second.current.openConversation(conversationId); });
  await sendMessage(second, 'second launch question');

  expect(listMessages(db, conversationId)).toHaveLength(4);
});

test('clear leaves the old thread behind instead of emptying it', async () => {
  const db = freshDb();
  const h = harness(db, fakeProvider());
  await sendMessage(h, 'first question');
  const firstId = h.current.conversationId!;

  act(() => { h.current.clear(); });

  expect(h.current.messages).toHaveLength(0);
  expect(h.current.conversationId).toBeNull();

  // The next question opens its own conversation; the cleared one keeps its
  // messages and takes no new ones.
  await sendMessage(h, 'second question');
  expect(h.current.conversationId).not.toBe(firstId);
  expect(listMessages(db, firstId).map(m => m.text)).toEqual(['first question', 'answer']);
  expect(listActiveConversations(db)).toHaveLength(2);
});

test('adding a message moves its conversation to the top of the sidebar', async () => {
  const db = freshDb();
  const stale = '2026-08-30T12:00:00.000Z';
  insertConversation(db, {
    uuid: 'seeded', title: 'Answered a week ago', deviceId: 'dev-1',
    createdAt: stale, updatedAt: stale, syncedAt: stale,
  });
  const h = harness(db, fakeProvider());
  act(() => { h.current.openConversation('seeded'); });

  await sendMessage(h, 'one more question');

  const [conversation] = listActiveConversations(db);
  expect(conversation.uuid).toBe('seeded');
  expect(conversation.updatedAt > stale).toBe(true);
});

/**
 * The rewording is what the user is reading, so it has to be what storage
 * holds. Re-inserting under the same uuid looks right and does nothing:
 * `insertMessage` is INSERT OR IGNORE.
 */
test('a reworded grounded reply replaces the curated wording in storage', async () => {
  const db = freshDb();
  const h = harness(
    db,
    fakeProvider({ rephrase: async () => 'Reworded by the model.' }),
    GROUNDED_CONTEXT,
  );

  await sendMessage(h, 'What varieties of mango are there?');

  const conversationId = listActiveConversations(db)[0].uuid;
  const [, reply] = listMessages(db, conversationId);
  expect(reply.role).toBe('assistant');
  expect(reply.text).toBe('Reworded by the model.');
  expect(h.current.messages[1].text).toBe('Reworded by the model.');
});

test('a stored verdict reopens as an object, not as a JSON string', async () => {
  const db = freshDb();
  const verdict = {
    fruitEmoji: '🥭', headline: 'Suited', fruitName: 'Mango',
    evidence: [{ label: 'Rainfall', value: '1800 mm', status: 'ok' }], sourceLabel: 'PAGASA',
  };
  const now = '2026-08-30T12:00:00.000Z';
  insertConversation(db, { uuid: 'c1', title: 'Mango', deviceId: 'dev-1', createdAt: now, updatedAt: now });
  insertMessage(db, {
    uuid: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', conversationId: 'c1', role: 'assistant',
    kind: 'grounded', text: 'Suited.', verdictJson: JSON.stringify(verdict), createdAt: now,
  });
  const h = harness(db, fakeProvider());

  act(() => { h.current.openConversation('c1'); });

  // `ChatScreen`'s verdict card maps over `evidence`; a string here is the
  // crash this pins down.
  expect(h.current.messages[0].verdict).toEqual(verdict);
  expect(Array.isArray(h.current.messages[0].verdict!.evidence)).toBe(true);
});

/**
 * The callback is how a local write reaches the sync queue's drain effect.
 * Both tiers persist two rows per send — the question and the reply — so a
 * single send fires it twice.
 */
test('onPersisted fires once for every persisted turn', async () => {
  const db = freshDb();
  const onPersisted = jest.fn();
  const h = harness(db, fakeProvider(), CONTEXT, onPersisted);

  await sendMessage(h, 'How do I care for a banana plant?');

  expect(onPersisted).toHaveBeenCalledTimes(2);
});

test('onPersisted does not fire when nothing was written', async () => {
  const db = freshDb();
  const onPersisted = jest.fn();
  const h = harness(db, fakeProvider(), CONTEXT, onPersisted);

  await sendMessage(h, '   ');

  expect(onPersisted).not.toHaveBeenCalled();
});
