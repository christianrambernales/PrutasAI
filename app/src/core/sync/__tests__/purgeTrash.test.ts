import { freshDb } from '../../db/testing/scanFixtures';
import {
  insertConversation, insertMessage, listMessages, listTrashedConversations, softDeleteConversation,
} from '../../db/repositories/conversations';
import { deleteConversationEverywhere, purgeTrash, RETENTION_DAYS } from '../purgeTrash';

const CREATED = '2026-08-01T00:00:00.000Z';

test('a conversation trashed more than 15 days ago is hard-deleted', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'old', title: 'Old', deviceId: 'dev-1', createdAt: CREATED, updatedAt: CREATED });
  softDeleteConversation(db, 'old', '2026-08-01T00:00:00.000Z');

  const result = await purgeTrash({ db, now: () => new Date('2026-08-30T00:00:00.000Z'), deleteRemote: async () => {} });

  expect(result.purged).toBe(1);
  expect(listTrashedConversations(db)).toHaveLength(0);
});

test('a conversation trashed less than 15 days ago is left alone', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'recent', title: 'Recent', deviceId: 'dev-1', createdAt: CREATED, updatedAt: CREATED });
  softDeleteConversation(db, 'recent', '2026-08-25T00:00:00.000Z');

  const result = await purgeTrash({ db, now: () => new Date('2026-08-30T00:00:00.000Z'), deleteRemote: async () => {} });

  expect(result.purged).toBe(0);
  expect(listTrashedConversations(db)).toHaveLength(1);
});

test('RETENTION_DAYS is 15', () => {
  expect(RETENTION_DAYS).toBe(15);
});

/**
 * The local row is the only record that the remote row is owed a delete —
 * `conversationsPastRetention` reads the local table. Deleting locally first
 * therefore made the failure unretryable: the server kept the conversation
 * forever and handed it back on the next sign-in restore.
 */
test('a remote delete failure leaves the conversation for the next sweep, without throwing', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'old', title: 'Old', deviceId: 'dev-1', createdAt: CREATED, updatedAt: CREATED });
  softDeleteConversation(db, 'old', '2026-08-01T00:00:00.000Z');

  const result = await purgeTrash({
    db, now: () => new Date('2026-08-30T00:00:00.000Z'),
    deleteRemote: async () => { throw new Error('offline'); },
  });

  expect(result.purged).toBe(0);
  expect(listTrashedConversations(db)).toHaveLength(1);
});

test('the sweep that runs after a failed one finishes the job', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'old', title: 'Old', deviceId: 'dev-1', createdAt: CREATED, updatedAt: CREATED });
  softDeleteConversation(db, 'old', '2026-08-01T00:00:00.000Z');
  const now = () => new Date('2026-08-30T00:00:00.000Z');

  await purgeTrash({ db, now, deleteRemote: async () => { throw new Error('offline'); } });
  const second = await purgeTrash({ db, now, deleteRemote: async () => {} });

  expect(second.purged).toBe(1);
  expect(listTrashedConversations(db)).toHaveLength(0);
});

/**
 * "Delete permanently" on the Trash screen and this sweep are the same
 * operation, and they go through the same function so they cannot drift
 * apart again: a local-only delete leaves the row on the server, which hands
 * the conversation straight back on the next sign-in restore.
 */
test('deleteConversationEverywhere removes the local rows and the remote one', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'Gone', deviceId: 'dev-1', createdAt: CREATED, updatedAt: CREATED });
  insertMessage(db, {
    uuid: 'm1', conversationId: 'c1', role: 'user', kind: null,
    text: 'hi', verdictJson: null, createdAt: CREATED,
  });
  softDeleteConversation(db, 'c1', CREATED);
  const deleted: string[] = [];

  await expect(
    deleteConversationEverywhere(db, 'c1', async uuid => { deleted.push(uuid); }),
  ).resolves.toBe(true);

  expect(deleted).toEqual(['c1']);
  expect(listTrashedConversations(db)).toHaveLength(0);
  expect(listMessages(db, 'c1')).toHaveLength(0);
});

test('deleteConversationEverywhere keeps the local rows when the remote call fails', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'Gone', deviceId: 'dev-1', createdAt: CREATED, updatedAt: CREATED });
  insertMessage(db, {
    uuid: 'm1', conversationId: 'c1', role: 'user', kind: null,
    text: 'hi', verdictJson: null, createdAt: CREATED,
  });
  softDeleteConversation(db, 'c1', CREATED);

  // Reported, not thrown: the caller decides what a pending delete means, and
  // for the sweep it means "try again next time".
  await expect(
    deleteConversationEverywhere(db, 'c1', async () => { throw new Error('offline'); }),
  ).resolves.toBe(false);

  expect(listTrashedConversations(db)).toHaveLength(1);
  expect(listMessages(db, 'c1')).toHaveLength(1);
});

test('the retention sweep deletes the remote row for every purged conversation', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'old', title: 'Old', deviceId: 'dev-1', createdAt: CREATED, updatedAt: CREATED });
  softDeleteConversation(db, 'old', '2026-08-01T00:00:00.000Z');
  const deleted: string[] = [];

  await purgeTrash({
    db,
    now: () => new Date('2026-08-30T00:00:00.000Z'),
    deleteRemote: async uuid => { deleted.push(uuid); },
  });

  expect(deleted).toEqual(['old']);
});
