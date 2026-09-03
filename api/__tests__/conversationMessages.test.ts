import { expect, test, vi } from 'vitest';
import { handleConversationMessages } from '../_lib/handlers/conversationMessages.js';

const CTX = { deviceId: 'device-1', ip: '1.2.3.4', accessToken: 'good-token' };

function deps(
  overrides: Partial<{
    verifyToken: () => Promise<string | null>;
    ownerOfConversation: () => Promise<string | null>;
    ownerOfMessage: () => Promise<string | null>;
    insertMessage: () => Promise<void>;
  }> = {},
) {
  return {
    limiter: { limit: vi.fn(async () => ({ success: true })) },
    verifyToken: vi.fn(overrides.verifyToken ?? (async () => 'user-1')),
    // The parent conversation drains before its messages, so by the time a
    // message arrives the caller owns the thread it belongs to.
    ownerOfConversation: vi.fn(overrides.ownerOfConversation ?? (async () => 'user-1')),
    // Null by default: a message being uploaded for the first time.
    ownerOfMessage: vi.fn(overrides.ownerOfMessage ?? (async () => null)),
    insertMessage: vi.fn(overrides.insertMessage ?? (async () => {})),
  };
}

const BODY = {
  uuid: '22222222-2222-4222-8222-222222222222',
  conversation_id: '11111111-1111-4111-8111-111111111111',
  role: 'user',
  kind: null,
  text: 'How do I care for a banana plant?',
  verdict_json: null,
  created_at: '2026-08-30T00:00:00.000Z',
};

test('a valid message inserts with user_id from the verified token', async () => {
  const d = deps();
  const result = await handleConversationMessages(d, BODY, CTX);

  expect(result.status).toBe(201);
  expect(d.insertMessage).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', id: BODY.uuid, role: 'user' }));
});

test('no bearer token is 401', async () => {
  const d = deps();
  const result = await handleConversationMessages(d, BODY, { ...CTX, accessToken: null });
  expect(result.status).toBe(401);
});

test('an invalid role is rejected with 400', async () => {
  const d = deps();
  const result = await handleConversationMessages(d, { ...BODY, role: 'system' }, CTX);
  expect(result.status).toBe(400);
});

test('over the rate limit is 429 with Retry-After', async () => {
  const d = deps();
  d.limiter.limit = vi.fn(async () => ({ success: false }));
  const result = await handleConversationMessages(d, BODY, CTX);
  expect(result.status).toBe(429);
  expect(result.headers?.['Retry-After']).toBe('60');
});

/**
 * The wire format is a JSON string — that is what the app's local TEXT
 * column holds — but `conversation_message.verdict_json` is `jsonb`. Handing
 * the string straight to it stores a JSON scalar string, and a restoring
 * device then parses its way back to a string instead of a verdict, which
 * the chat screen renders by calling `.map` on `undefined`. Parsing here is
 * what makes local → remote → restore round-trip to the original object.
 */
test('a verdict is parsed before insert, so the jsonb column holds an object', async () => {
  const d = deps();
  const verdict = { headline: 'Suited', evidence: [{ label: 'Rainfall', value: '1800 mm' }] };

  await handleConversationMessages(d, { ...BODY, verdict_json: JSON.stringify(verdict) }, CTX);

  expect(d.insertMessage).toHaveBeenCalledWith(expect.objectContaining({ verdict_json: verdict }));
  expect(d.insertMessage).not.toHaveBeenCalledWith(
    expect.objectContaining({ verdict_json: JSON.stringify(verdict) }),
  );
});

test('a null verdict stays null rather than becoming the string "null"', async () => {
  const d = deps();
  await handleConversationMessages(d, { ...BODY, verdict_json: null }, CTX);
  expect(d.insertMessage).toHaveBeenCalledWith(expect.objectContaining({ verdict_json: null }));
});

test('a verdict that is not valid JSON is rejected with 400 rather than reaching the parse', async () => {
  const d = deps();
  const result = await handleConversationMessages(d, { ...BODY, verdict_json: '{not json' }, CTX);
  expect(result.status).toBe(400);
  expect(d.insertMessage).not.toHaveBeenCalled();
});

/**
 * The insert runs as service_role, so RLS is not there to catch a message
 * addressed to somebody else's thread. Planting one would put text in a
 * conversation the victim reads and owns.
 */
test('a message aimed at another user\'s conversation is 403 and never writes', async () => {
  const d = deps({ ownerOfConversation: async () => 'someone-else' });
  const result = await handleConversationMessages(d, BODY, CTX);

  expect(result.status).toBe(403);
  expect(d.insertMessage).not.toHaveBeenCalled();
});

/**
 * The write is an upsert so a reworded reply can replace its stored twin. That
 * makes a deliberate id collision a takeover unless the existing row's owner
 * is checked too.
 */
test('overwriting another user\'s message id is 403 and never writes', async () => {
  const d = deps({ ownerOfMessage: async () => 'someone-else' });
  const result = await handleConversationMessages(d, BODY, CTX);

  expect(result.status).toBe(403);
  expect(d.insertMessage).not.toHaveBeenCalled();
});

/** The rewording path: same id, same owner, new text — this must go through. */
test('a caller may rewrite their own message', async () => {
  const d = deps({ ownerOfMessage: async () => 'user-1' });
  const result = await handleConversationMessages(d, { ...BODY, text: 'Reworded by the model.' }, CTX);

  expect(result.status).toBe(201);
  expect(d.insertMessage).toHaveBeenCalledWith(
    expect.objectContaining({ id: BODY.uuid, text: 'Reworded by the model.' }),
  );
});

/**
 * An unknown conversation is left to the insert on purpose. Its foreign key
 * rejects it with a 502, which the drain retries; a 4xx here would be recorded
 * as permanently accepted and the message would be dropped.
 */
test('an unknown conversation reaches the insert rather than being refused', async () => {
  const d = deps({ ownerOfConversation: async () => null });
  const result = await handleConversationMessages(d, BODY, CTX);

  expect(result.status).toBe(201);
  expect(d.insertMessage).toHaveBeenCalled();
});

test('an ownership lookup failure is 502 and does not leak the cause', async () => {
  const d = deps({ ownerOfMessage: async () => { throw new Error('connection string leak'); } });
  const result = await handleConversationMessages(d, BODY, CTX);

  expect(result.status).toBe(502);
  expect(JSON.stringify(result.body)).not.toContain('connection string');
  expect(d.insertMessage).not.toHaveBeenCalled();
});
