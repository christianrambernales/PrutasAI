import { freshDb } from '../../db/testing/scanFixtures';
import { insertConversation, insertMessage, pendingConversations, pendingMessages } from '../../db/repositories/conversations';
import { drainConversations } from '../drainConversations';

const NOW = () => new Date('2026-08-30T12:00:00.000Z');

test('an empty access token no-ops without issuing a request', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'T', deviceId: 'dev-1', createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' });
  const fetchImpl = jest.fn();

  const report = await drainConversations({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: '', fetchImpl, now: NOW });

  expect(report).toEqual({ attempted: 0, synced: 0, failed: 0, sessionExpired: false });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('drains pending conversations before pending messages, marking each synced on 2xx', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'T', deviceId: 'dev-1', createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' });
  insertMessage(db, { uuid: 'm1', conversationId: 'c1', role: 'user', kind: null, text: 'hi', verdictJson: null, createdAt: '2026-08-30T00:00:01.000Z' });
  const fetchImpl = jest.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 201 }));

  const report = await drainConversations({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'tok', fetchImpl, now: NOW });

  expect(report).toEqual({ attempted: 2, synced: 2, failed: 0, sessionExpired: false });
  expect(pendingConversations(db, 50)).toHaveLength(0);
  expect(pendingMessages(db, 50)).toHaveLength(0);
  const urls = fetchImpl.mock.calls.map(c => String(c[0]));
  expect(urls[0]).toBe('https://x.test/api/v1/conversations');
  expect(urls[1]).toBe('https://x.test/api/v1/conversation-messages');
});

test('a 401 on the conversations phase stops before attempting messages', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'T', deviceId: 'dev-1', createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' });
  insertMessage(db, { uuid: 'm1', conversationId: 'c1', role: 'user', kind: null, text: 'hi', verdictJson: null, createdAt: '2026-08-30T00:00:01.000Z' });
  const fetchImpl = jest.fn(async () => new Response(null, { status: 401 }));

  const report = await drainConversations({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'stale', fetchImpl, now: NOW });

  expect(report.sessionExpired).toBe(true);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('a 429 stops the current phase and leaves the row queued', async () => {
  const db = freshDb();
  insertConversation(db, { uuid: 'c1', title: 'T', deviceId: 'dev-1', createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z' });
  const fetchImpl = jest.fn(async () => new Response(null, { status: 429 }));

  await drainConversations({ db, baseUrl: 'https://x.test/api', deviceId: 'dev-1', accessToken: 'tok', fetchImpl, now: NOW });

  expect(pendingConversations(db, 50)).toHaveLength(1);
});
