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

import { useChat, titleFrom } from '../useChat';
import { freshDb } from '../../../core/db/testing/scanFixtures';
import {
  insertConversation, insertMessage, listActiveConversations, listMessages,
} from '../../../core/db/repositories/conversations';
import * as preview from '../../../preview/previewContent';
import type { ChatContext } from '../../../core/chat/answer';
import type { ChatProvider, GeneralRequestOptions } from '../../../core/chat/providers/types';
import type { LocalAccountScope } from '../../../core/db/repositories/scans';

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
    rephrase: async a => ({ status: 'accepted', text: a.text }),
    answerGeneral: async () => ({ onTopic: true, text: 'answer', error: null, errorKind: null, policy: 'general', warning: true }),
    ...overrides,
  };
}

function harness(
  db: ReturnType<typeof freshDb>,
  provider: ChatProvider,
  context: ChatContext = CONTEXT,
  onPersisted?: () => void,
  scope: LocalAccountScope = { activeAccountId: null },
) {
  let hook!: ReturnType<typeof useChat>;
  function Harness() {
    hook = useChat(context, provider, db, 'device', onPersisted, scope);
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

test('an account switch cannot reopen another account\'s retained conversation id', async () => {
  const db = freshDb();
  const accountA = { activeAccountId: 'account-a' };
  const accountB = { activeAccountId: 'account-b' };
  const a = harness(db, fakeProvider(), CONTEXT, undefined, accountA);

  await sendMessage(a, 'How do I care for a banana plant?');
  const conversationId = a.current.conversationId!;
  expect(listActiveConversations(db, accountA)).toHaveLength(1);

  const b = harness(db, fakeProvider(), CONTEXT, undefined, accountB);
  act(() => { b.current.openConversation(conversationId); });

  expect(b.current.conversationId).toBeNull();
  expect(b.current.messages).toEqual([]);
  expect(listActiveConversations(db, accountB)).toHaveLength(0);
});

// Requirement carried in from outside the brief: `answerGeneral`'s `history`
// parameter is optional, and an empty history must be left out of the call
// rather than passed as `[]` — this is the only test that pins that down.
test('a first question omits the history argument entirely', async () => {
  const db = freshDb();
  const answerGeneral = jest.fn(async (_q: string, _c: string, _options?: GeneralRequestOptions) => (
    { onTopic: true, text: 'answer', error: null, errorKind: null, policy: 'general' as const, warning: true }
  ));
  const h = harness(db, fakeProvider({ answerGeneral }));

  await sendMessage(h, 'How do I care for a banana plant?');

  expect(answerGeneral).toHaveBeenCalledTimes(1);
  const options = answerGeneral.mock.calls[0][2]!;
  expect(options).toMatchObject({ policy: 'general', language: 'EN' });
  expect(options.history).toBeUndefined();
});

test('a second question in the same conversation sends the first exchange as history', async () => {
  const db = freshDb();
  // The default resolves every call to 'second answer'; overridden once so the
  // *first* turn's persisted reply is 'answer' — what the history assertion
  // below expects that turn to have said. Typed with the real parameter list
  // (rather than left as the zero-arg `async () => ...` shorthand) so
  // `mock.calls[n]` is a 3-element tuple and the destructure below type-checks.
  const answerGeneral = jest.fn(async (_q: string, _c: string, _options?: GeneralRequestOptions) => (
    { onTopic: true, text: 'second answer', error: null, errorKind: null, policy: 'general' as const, warning: true }
  ));
  answerGeneral.mockResolvedValueOnce({ onTopic: true, text: 'answer', error: null, errorKind: null, policy: 'general', warning: true });
  const h = harness(db, fakeProvider({ answerGeneral }));

  await sendMessage(h, 'first question');
  await sendMessage(h, 'second question');

  const options = answerGeneral.mock.calls[1][2]!;
  expect(options.history).toEqual([
    { role: 'user', text: 'first question' },
    { role: 'assistant', text: 'answer' },
  ]);
});

test('restricted answers carry a per-answer awareness warning kind and survive conversation restore', async () => {
  const db = freshDb();
  const answerGeneral = jest.fn(async (_q: string, _c: string, _options?: GeneralRequestOptions) => ({
    onTopic: true,
    text: 'Visible signs can have several causes. Consult a local agriculturist.',
    error: null,
    errorKind: null,
    policy: 'restricted' as const,
    warning: true,
  }));
  const h = harness(db, fakeProvider({ answerGeneral }));

  await sendMessage(h, 'Anong gamot sa sakit ng mangga?');

  expect(answerGeneral.mock.calls[0][2]!).toMatchObject({ policy: 'restricted', language: 'EN' });
  expect(h.current.messages[1].kind).toBe('restricted');
  const conversationId = listActiveConversations(db)[0].uuid;
  expect(listMessages(db, conversationId)[1].kind).toBe('restricted');
  act(() => { h.current.openConversation(conversationId); });
  expect(h.current.messages[1].kind).toBe('restricted');
});

test('a server-restricted outcome remains warned when the local question classifier missed it', async () => {
  const db = freshDb();
  const answerGeneral = jest.fn(async (_q: string, _c: string, _options?: GeneralRequestOptions) => ({
    onTopic: true,
    text: 'Server fallback wording.',
    error: null,
    errorKind: null,
    policy: 'restricted' as const,
    warning: true,
  }));
  const h = harness(db, fakeProvider({ answerGeneral }));
  await sendMessage(h, 'How far apart should I space mango seedlings?');

  expect(h.current.messages).toHaveLength(2);
  expect(answerGeneral.mock.calls[0][2]!).toMatchObject({ policy: 'general' });
  expect(h.current.messages[1]).toMatchObject({ kind: 'restricted' });
  expect(h.current.messages[1].text).toContain('local agriculturist');
});

test('offline restricted questions get local awareness and the harvested mold caution', async () => {
  const db = freshDb();
  const answerGeneral = jest.fn();
  const h = harness(db, fakeProvider({ remote: false, answerGeneral }));

  await sendMessage(h, 'The harvested mango is moldy and rotting.');

  expect(answerGeneral).not.toHaveBeenCalled();
  expect(h.current.messages[1].kind).toBe('restricted');
  expect(h.current.messages[1].text).toContain('do not eat or sell');
  expect(h.current.messages[1].text).toContain('local agriculturist');
});

test('a retry re-asks the failed general question without duplicating the user turn', async () => {
  const db = freshDb();
  const answerGeneral = jest.fn()
    .mockResolvedValueOnce({
      onTopic: false, text: '', error: 'too many', errorKind: 'rateLimited', policy: 'general', warning: false,
    })
    .mockResolvedValueOnce({
      onTopic: true, text: 'Space them evenly.', error: null, errorKind: null, policy: 'general', warning: true,
    });
  const h = harness(db, fakeProvider({ answerGeneral }));

  await sendMessage(h, 'How far apart should I space banana suckers?');
  expect(h.current.messages[1].kind).toBe('notice');
  expect(h.current.retry).toBeDefined();
  await act(async () => { await h.current.retry!(); });

  expect(answerGeneral).toHaveBeenCalledTimes(2);
  expect(h.current.messages.map(message => message.role)).toEqual(['user', 'assistant', 'assistant']);
  expect(h.current.messages[2].kind).toBe('general');
  expect(h.current.retry).toBeUndefined();
  const conversationId = listActiveConversations(db)[0].uuid;
  expect(listMessages(db, conversationId).filter(message => message.role === 'user')).toHaveLength(1);
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
test('a rejected grounded rephrase keeps the curated answer and persists a visible notice', async () => {
  const db = freshDb();
  const h = harness(
    db,
    fakeProvider({ rephrase: async () => ({ status: 'rejected', reason: 'protected_content_changed' }) }),
    GROUNDED_CONTEXT,
  );

  await sendMessage(h, 'What varieties of mango are there?');

  const conversationId = listActiveConversations(db)[0].uuid;
  const [, reply, notice] = listMessages(db, conversationId);
  expect(reply.role).toBe('assistant');
  expect(reply.kind).toBe('grounded');
  expect(reply.text).toContain('varieties');
  expect(notice.role).toBe('assistant');
  expect(notice.kind).toBe('notice');
  expect(notice.text).toMatch(/original.*kept/i);
  expect(h.current.messages[1].text).toBe(reply.text);
  expect(h.current.messages[2].text).toBe(notice.text);

  const reopened = harness(db, fakeProvider(), GROUNDED_CONTEXT);
  act(() => { reopened.current.openConversation(conversationId); });
  expect(reopened.current.messages.map(message => message.kind)).toEqual([undefined, 'grounded', 'notice']);
});

test('the chat boundary rejects a provider that labels changed text as accepted', async () => {
  const db = freshDb();
  const h = harness(
    db,
    fakeProvider({ rephrase: async () => ({ status: 'accepted', text: 'Mango is guaranteed to be suitable.' }) }),
    GROUNDED_CONTEXT,
  );

  await sendMessage(h, 'What varieties of mango are there?');

  const rows = listMessages(db, listActiveConversations(db)[0].uuid);
  expect(rows[1].kind).toBe('grounded');
  expect(rows[1].text).toBe(h.current.messages[1].text);
  expect(rows[1].text).not.toContain('guaranteed');
  expect(rows[2]).toMatchObject({ role: 'assistant', kind: 'notice' });
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

describe('titleFrom', () => {
  test('trims and normalizes whitespace', () => {
    expect(titleFrom('  too   much   \n whitespace  ')).toBe('too much whitespace');
  });

  test('truncates to 40 characters and adds an ellipsis', () => {
    const long = 'This is a very long question that will definitely exceed the forty character limit.';
    expect(titleFrom(long)).toBe('This is a very long question that will d…');
  });

  test('returns the original string if under 40 characters', () => {
    expect(titleFrom('Short question')).toBe('Short question');
  });
});
