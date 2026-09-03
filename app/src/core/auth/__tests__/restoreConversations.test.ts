import { freshDb } from '../../db/testing/scanFixtures';
import {
  insertConversation, listActiveConversations, listMessages, listTrashedConversations,
} from '../../db/repositories/conversations';
import { restoreConversations } from '../restoreConversations';

test('remote conversations and messages are written locally as already synced', async () => {
  const db = freshDb();
  const now = () => new Date('2026-08-30T12:00:00.000Z');
  const fetchRemote = async () => ({
    conversations: [{ id: 'c1', title: 'Banana care', created_at: '2026-08-29T00:00:00.000Z', updated_at: '2026-08-29T00:00:00.000Z', deleted_at: null }],
    messages: [{ id: 'm1', conversation_id: 'c1', role: 'user' as const, kind: null, text: 'hi', verdict_json: null, created_at: '2026-08-29T00:00:01.000Z' }],
  });

  const report = await restoreConversations({ db, fetchRemote, now });

  expect(report).toEqual({ restored: 1, restoreFailed: false });
  expect(listActiveConversations(db)).toHaveLength(1);
  expect(listMessages(db, 'c1')).toHaveLength(1);
});

test('a fetch failure is reported rather than silently returning nothing', async () => {
  const db = freshDb();
  const fetchRemote = async () => { throw new Error('network'); };

  const report = await restoreConversations({ db, fetchRemote });

  expect(report).toEqual({ restored: 0, restoreFailed: true });
});

test('a conversation already held locally is not duplicated', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'Local title', deviceId: 'dev-1', createdAt: '2026-08-29T00:00:00.000Z', updatedAt: '2026-08-29T00:00:00.000Z' });
  const fetchRemote = async () => ({
    conversations: [{ id: 'c1', title: 'Remote title', created_at: '2026-08-29T00:00:00.000Z', updated_at: '2026-08-29T00:00:00.000Z', deleted_at: null }],
    messages: [],
  });

  await restoreConversations({ db, fetchRemote });

  expect(listActiveConversations(db)[0].title).toBe('Local title');
});

/**
 * Trash is per-account, not per-device: a conversation trashed on one device
 * must arrive on the next as trashed, keeping the deletion timestamp its
 * 15-day retention is measured from. Restoring it as active would both
 * un-delete it behind the user's back and reset that clock.
 */
test('a conversation trashed remotely restores as trashed, keeping its deletion time', async () => {
  const db = freshDb();
  const fetchRemote = async () => ({
    conversations: [{
      id: 'c1', title: 'Binned on the other phone',
      created_at: '2026-08-20T00:00:00.000Z', updated_at: '2026-08-21T00:00:00.000Z',
      deleted_at: '2026-08-21T00:00:00.000Z',
    }],
    messages: [],
  });

  await restoreConversations({ db, fetchRemote });

  expect(listActiveConversations(db)).toHaveLength(0);
  const trashed = listTrashedConversations(db);
  expect(trashed).toHaveLength(1);
  expect(trashed[0].deletedAt).toBe('2026-08-21T00:00:00.000Z');
});

/**
 * The remote column is jsonb, so a synced verdict comes back as an object.
 * It has to land in the local TEXT column as the JSON *of that object* — the
 * shape `listMessages` callers parse — and not as a re-encoded string, which
 * parses back to a string and renders as an empty verdict card.
 */
test('a verdict restores as an object once parsed back out of local storage', async () => {
  const db = freshDb();
  const verdict = {
    fruitEmoji: '🍌', headline: 'Suited', fruitName: 'Banana',
    evidence: [{ label: 'Rainfall', value: '1800 mm', status: 'ok' }], sourceLabel: 'PAGASA',
  };
  const fetchRemote = async () => ({
    conversations: [{
      id: 'c1', title: 'Banana care', created_at: '2026-08-29T00:00:00.000Z',
      updated_at: '2026-08-29T00:00:00.000Z', deleted_at: null,
    }],
    messages: [{
      id: 'm1', conversation_id: 'c1', role: 'assistant' as const, kind: 'grounded',
      text: 'Suited.', verdict_json: verdict, created_at: '2026-08-29T00:00:01.000Z',
    }],
  });

  await restoreConversations({ db, fetchRemote });

  const [msg] = listMessages(db, 'c1');
  const parsed = JSON.parse(msg.verdictJson!);
  expect(parsed).toEqual(verdict);
  expect(Array.isArray(parsed.evidence)).toBe(true);
});
