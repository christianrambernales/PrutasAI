import { freshDb } from '../../testing/scanFixtures';
import {
  newConversationUuid, newMessageUuid, insertConversation, insertMessage, listActiveConversations,
  listTrashedConversations, listMessages, lastMessages, renameConversation,
  softDeleteConversation, restoreConversation, hardDeleteConversation,
  conversationsPastRetention, pendingConversations, markConversationSynced,
  resetConversationSyncQueue, pendingMessages, markMessageSynced, resetMessageSyncQueue,
  updateMessageText, touchConversation,
} from '../conversations';

const NOW = '2026-08-30T12:00:00.000Z';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('newConversationUuid returns a v4 uuid', () => {
  const uuid = newConversationUuid();
  expect(uuid).toMatch(UUID_V4);
});

// The server rejects anything that is not a v4 UUID with a 400, and the drain
// treats a 4xx as permanently accepted — so a non-UUID message id is a
// message that silently never syncs.
test('newMessageUuid returns a v4 uuid, distinct per call', () => {
  const a = newMessageUuid();
  const b = newMessageUuid();
  expect(a).toMatch(UUID_V4);
  expect(b).toMatch(UUID_V4);
  expect(a).not.toBe(b);
});

test('a restored trashed conversation is inserted as trashed, not active', () => {
  const db = freshDb();
  insertConversation(db, {
    uuid: 'c1', title: 'Trashed elsewhere', deviceId: 'restored',
    createdAt: NOW, updatedAt: NOW, deletedAt: '2026-08-20T00:00:00.000Z', syncedAt: NOW,
  });

  expect(listActiveConversations(db)).toHaveLength(0);
  expect(listTrashedConversations(db)).toHaveLength(1);
  expect(listTrashedConversations(db)[0].deletedAt).toBe('2026-08-20T00:00:00.000Z');
});

test('updateMessageText rewrites the text in place and re-queues the row', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'T', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });
  insertMessage(db, {
    uuid: 'm1', conversationId: 'c1', role: 'assistant', kind: 'grounded',
    text: 'Curated wording.', verdictJson: null, createdAt: NOW, syncedAt: NOW,
  });

  updateMessageText(db, 'm1', 'Reworded wording.');

  const [msg] = listMessages(db, 'c1');
  expect(msg.text).toBe('Reworded wording.');
  expect(msg.createdAt).toBe(NOW);
  expect(pendingMessages(db, 50).map(m => m.uuid)).toEqual(['m1']);
});

test('touchConversation moves a conversation to the top of the active list and re-queues it', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'older', title: 'Older', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW, syncedAt: NOW });
  insertConversation(db, {
    uuid: 'newer', title: 'Newer', deviceId: 'dev-1',
    createdAt: NOW, updatedAt: '2026-08-30T13:00:00.000Z', syncedAt: NOW,
  });
  expect(listActiveConversations(db).map(c => c.uuid)).toEqual(['newer', 'older']);

  touchConversation(db, 'older', '2026-08-30T14:00:00.000Z');

  expect(listActiveConversations(db).map(c => c.uuid)).toEqual(['older', 'newer']);
  expect(pendingConversations(db, 50).map(c => c.uuid)).toEqual(['older']);
});

test('a conversation with no messages lists as active with its own title', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'Banana care', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });

  const active = listActiveConversations(db);
  expect(active).toHaveLength(1);
  expect(active[0].title).toBe('Banana care');
});

test('soft-deleting moves a conversation from active to trashed', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'Banana care', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });

  softDeleteConversation(db, 'c1', '2026-08-30T13:00:00.000Z');

  expect(listActiveConversations(db)).toHaveLength(0);
  expect(listTrashedConversations(db)).toHaveLength(1);
});

test('restoring a trashed conversation moves it back to active', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'Banana care', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });
  softDeleteConversation(db, 'c1', '2026-08-30T13:00:00.000Z');

  restoreConversation(db, 'c1', '2026-08-30T14:00:00.000Z');

  expect(listActiveConversations(db)).toHaveLength(1);
  expect(listTrashedConversations(db)).toHaveLength(0);
});

test('renaming updates the title and does not affect trash state', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'Old title', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });

  renameConversation(db, 'c1', 'New title', '2026-08-30T13:00:00.000Z');

  expect(listActiveConversations(db)[0].title).toBe('New title');
});

test('hard-deleting a conversation cascades to its messages', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'Banana care', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });
  insertMessage(db, { uuid: 'm1', conversationId: 'c1', role: 'user', kind: null, text: 'hi', verdictJson: null, createdAt: NOW });

  hardDeleteConversation(db, 'c1');

  expect(listActiveConversations(db)).toHaveLength(0);
  expect(listTrashedConversations(db)).toHaveLength(0);
  expect(listMessages(db, 'c1')).toHaveLength(0);
});

test('conversationsPastRetention returns only conversations deleted before the cutoff', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'old', title: 'Old', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });
  insertConversation(db, { uuid: 'recent', title: 'Recent', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });
  softDeleteConversation(db, 'old', '2026-08-01T00:00:00.000Z');
  softDeleteConversation(db, 'recent', '2026-08-29T00:00:00.000Z');

  const due = conversationsPastRetention(db, '2026-08-15T00:00:00.000Z');

  expect(due).toEqual(['old']);
});

test('lastMessages returns at most the requested count, oldest first', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'T', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });
  for (let i = 0; i < 5; i += 1) {
    insertMessage(db, {
      uuid: `m${i}`, conversationId: 'c1', role: i % 2 === 0 ? 'user' : 'assistant',
      kind: null, text: `msg ${i}`, verdictJson: null,
      createdAt: `2026-08-30T12:0${i}:00.000Z`,
    });
  }

  const last3 = lastMessages(db, 'c1', 3);

  expect(last3.map(m => m.text)).toEqual(['msg 2', 'msg 3', 'msg 4']);
});

test('a verdict is stored and returned as JSON', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'T', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });
  const verdict = { fruitEmoji: '🍌', headline: 'Suited', fruitName: 'Banana', evidence: [], sourceLabel: 'src' };
  insertMessage(db, {
    uuid: 'm1', conversationId: 'c1', role: 'assistant', kind: 'grounded',
    text: 'Suited.', verdictJson: JSON.stringify(verdict), createdAt: NOW,
  });

  const [msg] = listMessages(db, 'c1');
  expect(JSON.parse(msg.verdictJson!)).toEqual(verdict);
});

test('pendingConversations is the synced_at IS NULL queue, oldest first', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'A', deviceId: 'dev-1', createdAt: '2026-08-30T12:00:00.000Z', updatedAt: NOW });
  insertConversation(db, { uuid: 'c2', title: 'B', deviceId: 'dev-1', createdAt: '2026-08-30T11:00:00.000Z', updatedAt: NOW });

  const pending = pendingConversations(db, 50);

  expect(pending.map(p => p.uuid)).toEqual(['c2', 'c1']);
});

test('markConversationSynced removes a row from the pending queue', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'A', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });

  markConversationSynced(db, 'c1', '2026-08-30T13:00:00.000Z');

  expect(pendingConversations(db, 50)).toHaveLength(0);
});

test('resetConversationSyncQueue re-queues every conversation', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'A', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW, syncedAt: NOW });

  resetConversationSyncQueue(db);

  expect(pendingConversations(db, 50)).toHaveLength(1);
});

test('message sync queue mirrors the conversation one', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'A', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });
  insertMessage(db, { uuid: 'm1', conversationId: 'c1', role: 'user', kind: null, text: 'hi', verdictJson: null, createdAt: NOW, syncedAt: NOW });

  expect(pendingMessages(db, 50)).toHaveLength(0);
  resetMessageSyncQueue(db);
  expect(pendingMessages(db, 50)).toHaveLength(1);
  markMessageSynced(db, 'm1', '2026-08-30T13:00:00.000Z');
  expect(pendingMessages(db, 50)).toHaveLength(0);
});

test('re-inserting a held uuid is ignored rather than throwing', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'Local title', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW });
  insertMessage(db, { uuid: 'm1', conversationId: 'c1', role: 'user', kind: null, text: 'local', verdictJson: null, createdAt: NOW });

  expect(() => {
    insertConversation(db, { uuid: 'c1', title: 'Remote title', deviceId: 'restored', createdAt: NOW, updatedAt: NOW, syncedAt: NOW });
    insertMessage(db, { uuid: 'm1', conversationId: 'c1', role: 'user', kind: null, text: 'remote', verdictJson: null, createdAt: NOW, syncedAt: NOW });
  }).not.toThrow();

  expect(listActiveConversations(db)).toHaveLength(1);
  expect(listActiveConversations(db)[0].title).toBe('Local title');
  expect(listMessages(db, 'c1')).toHaveLength(1);
  expect(listMessages(db, 'c1')[0].text).toBe('local');
});

test('renaming re-queues the conversation for sync', () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'Old title', deviceId: 'dev-1', createdAt: NOW, updatedAt: NOW, syncedAt: NOW });
  expect(pendingConversations(db, 50)).toHaveLength(0);

  renameConversation(db, 'c1', 'New title', '2026-08-30T13:00:00.000Z');

  expect(pendingConversations(db, 50).map(p => p.uuid)).toEqual(['c1']);
});
