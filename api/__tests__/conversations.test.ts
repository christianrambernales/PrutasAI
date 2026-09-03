import { expect, test, vi } from 'vitest';
import { handleConversations } from '../_lib/handlers/conversations.js';

const CTX = { deviceId: 'device-1', ip: '1.2.3.4', accessToken: 'good-token' };

function deps(
  overrides: Partial<{
    verifyToken: () => Promise<string | null>;
    ownerOfConversation: () => Promise<string | null>;
    upsertConversation: () => Promise<void>;
  }> = {},
) {
  return {
    limiter: { limit: vi.fn(async () => ({ success: true })) },
    verifyToken: vi.fn(overrides.verifyToken ?? (async () => 'user-1')),
    // Null by default: the ordinary case is a conversation being uploaded for
    // the first time, which nobody owns yet.
    ownerOfConversation: vi.fn(overrides.ownerOfConversation ?? (async () => null)),
    upsertConversation: vi.fn(overrides.upsertConversation ?? (async () => {})),
  };
}

const BODY = {
  uuid: '11111111-1111-4111-8111-111111111111',
  title: 'Banana care',
  created_at: '2026-08-30T00:00:00.000Z',
  updated_at: '2026-08-30T00:00:00.000Z',
  deleted_at: null,
};

test('a valid request upserts with user_id from the verified token', async () => {
  const d = deps();
  const result = await handleConversations(d, BODY, CTX);

  expect(result.status).toBe(201);
  expect(d.upsertConversation).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', id: BODY.uuid, title: 'Banana care' }));
});

test('no bearer token is 401 and never calls upsertConversation', async () => {
  const d = deps();
  const result = await handleConversations(d, BODY, { ...CTX, accessToken: null });

  expect(result.status).toBe(401);
  expect(d.upsertConversation).not.toHaveBeenCalled();
});

test('a token that fails to verify is 401', async () => {
  const d = deps({ verifyToken: async () => null });
  const result = await handleConversations(d, BODY, CTX);

  expect(result.status).toBe(401);
});

test('an unknown field is rejected with 400', async () => {
  const d = deps();
  const result = await handleConversations(d, { ...BODY, bogus: 'x' }, CTX);

  expect(result.status).toBe(400);
});

test('user_id in the body is ignored — it always comes from the token', async () => {
  const d = deps();
  await handleConversations(d, { ...BODY, user_id: 'someone-else' }, CTX);

  expect(d.upsertConversation).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1' }));
});

test('over the rate limit is 429 with Retry-After', async () => {
  const d = deps();
  d.limiter.limit = vi.fn(async () => ({ success: false }));
  const result = await handleConversations(d, BODY, CTX);

  expect(result.status).toBe(429);
  expect(result.headers?.['Retry-After']).toBe('60');
});

test('a storage failure is reported without echoing the cause', async () => {
  const d = deps({ upsertConversation: async () => { throw new Error('connection string leak'); } });
  const result = await handleConversations(d, BODY, CTX);

  expect(result.status).toBe(502);
  expect(JSON.stringify(result.body)).not.toContain('connection string');
});

/**
 * The upsert runs as service_role, which bypasses RLS, and `id` is the whole
 * primary key. Without this check, knowing a uuid was enough to retitle,
 * soft-delete, or take ownership of someone else's conversation.
 */
test('upserting over another user\'s conversation is 403 and never writes', async () => {
  const d = deps({ ownerOfConversation: async () => 'someone-else' });
  const result = await handleConversations(d, BODY, CTX);

  expect(result.status).toBe(403);
  expect(d.upsertConversation).not.toHaveBeenCalled();
});

test('a caller may still upsert over their own conversation', async () => {
  const d = deps({ ownerOfConversation: async () => 'user-1' });
  const result = await handleConversations(d, { ...BODY, title: 'Renamed' }, CTX);

  expect(result.status).toBe(201);
  expect(d.upsertConversation).toHaveBeenCalledWith(expect.objectContaining({ title: 'Renamed' }));
});

test('an ownership lookup failure is 502, not a write attempted anyway', async () => {
  const d = deps({ ownerOfConversation: async () => { throw new Error('connection string leak'); } });
  const result = await handleConversations(d, BODY, CTX);

  expect(result.status).toBe(502);
  expect(JSON.stringify(result.body)).not.toContain('connection string');
  expect(d.upsertConversation).not.toHaveBeenCalled();
});
