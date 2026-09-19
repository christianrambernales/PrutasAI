import { describe, expect, test, vi } from 'vitest';
import { handleScans, type InsertableScan } from '../_lib/handlers/scans.js';
import { handleConversations, type UpsertableConversation } from '../_lib/handlers/conversations.js';
import { handleConversationMessages, type InsertableMessage } from '../_lib/handlers/conversationMessages.js';
import { handleClaim } from '../_lib/handlers/claim.js';
import { OwnershipConflictError } from '../_lib/validate.js';
import { bearerToken } from '../_lib/http.js';

const DEV_CTX = { deviceId: 'device-test-1', ip: '192.0.2.1', accessToken: 'valid-token-user-a' };
const USER_A = 'user-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'user-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// ============================================================================
// Scans Adversarial & Concurrency Suite
// ============================================================================
describe('Scans Ownership & Security', () => {
  const baseScan = {
    uuid: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    created_at: '2026-09-19T10:00:00.000Z',
    fruit_key: 'banana',
    fruit_conf: 0.95,
  };

  function mockScanDeps(overrides: {
    userId?: string | null;
    existingOwner?: string | null;
    ownerOfScan?: (id: string) => Promise<string | null>;
    insertScan?: (row: InsertableScan) => Promise<void>;
  } = {}) {
    return {
      limiter: { limit: vi.fn(async () => ({ success: true })) },
      verifyToken: vi.fn(async (_t: string) => overrides.userId !== undefined ? overrides.userId : USER_A),
      ownerOfScan: vi.fn(overrides.ownerOfScan ?? (async (_id: string) => overrides.existingOwner !== undefined ? overrides.existingOwner : null)),
      insertScan: vi.fn(overrides.insertScan ?? (async (_r: InsertableScan) => {})),
    };
  }

  test('forged user_id in body is rejected: only verified identity wins', async () => {
    const deps = mockScanDeps();
    const result = await handleScans(deps, { ...baseScan, user_id: USER_B }, DEV_CTX);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: 'unknown field: user_id' });
    expect(deps.insertScan).not.toHaveBeenCalled();
  });

  test('cross-owner UUID replay is rejected with 403', async () => {
    const deps = mockScanDeps({ existingOwner: USER_B });
    const result = await handleScans(deps, baseScan, DEV_CTX);

    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: 'not your scan' });
    expect(deps.insertScan).not.toHaveBeenCalled();
  });

  test('two callers racing for one new UUID: second caller gets sanitized 403', async () => {
    // Both callers pass preflight (null owner), but atomic insert on Caller 2 throws conflict
    const deps1 = mockScanDeps({ existingOwner: null });
    const deps2 = mockScanDeps({
      existingOwner: null,
      insertScan: async () => {
        throw new OwnershipConflictError('ownership conflict: scan owned by another account');
      },
    });

    const res1 = await handleScans(deps1, baseScan, DEV_CTX);
    const res2 = await handleScans(deps2, baseScan, { ...DEV_CTX, accessToken: 'token-user-b' });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(403);
    expect(res2.body).toEqual({ error: 'not your scan' });
  });

  test('own-owner idempotent replay succeeds and verified identity is written', async () => {
    const deps = mockScanDeps({ existingOwner: USER_A });
    const result = await handleScans(deps, {
      ...baseScan,
      updated_at: '2026-09-19T10:05:00.000Z',
      deleted_at: null,
    }, DEV_CTX);

    expect(result.status).toBe(201);
    expect(deps.insertScan).toHaveBeenCalledTimes(1);
    const writtenRow = deps.insertScan.mock.calls[0][0];
    expect(writtenRow.id).toBe(baseScan.uuid);
    expect(writtenRow.user_id).toBe(USER_A);
    expect(writtenRow.updated_at).toBe('2026-09-19T10:05:00.000Z');
  });

  test.each([
    ['missing token', { ...DEV_CTX, accessToken: null }, 401, 'authentication required'],
    ['malformed header', { ...DEV_CTX, accessToken: bearerToken({ authorization: 'InvalidScheme xyz' }) }, 401, 'authentication required'],
    ['invalid token', DEV_CTX, 401, 'authentication required', null],
    ['expired token', DEV_CTX, 401, 'authentication required', null],
  ])('token variation: %s returns %i', async (_desc, ctx, expectedStatus, expectedError, verifiedUser?: string | null) => {
    const deps = mockScanDeps({ userId: verifiedUser !== undefined ? verifiedUser : USER_A });
    const result = await handleScans(deps, baseScan, ctx);

    expect(result.status).toBe(expectedStatus);
    expect(result.body).toEqual({ error: expectedError });
    expect(deps.insertScan).not.toHaveBeenCalled();
  });

  test.each([
    ['invalid uuid', { ...baseScan, uuid: 'not-a-valid-uuid' }, 'uuid must be a UUID'],
    ['invalid created_at', { ...baseScan, created_at: 'yesterday' }, 'created_at must be ISO-8601'],
    ['invalid updated_at', { ...baseScan, updated_at: 'bad-date' }, 'updated_at must be ISO-8601'],
    ['fruit_conf out of bounds', { ...baseScan, fruit_conf: 1.5 }, 'fruit_conf must be between 0 and 1'],
    ['remote image_uri', { ...baseScan, image_uri: 'http://malicious.site/pic.jpg' }, 'image_uri must be local'],
    ['unknown attribute', { ...baseScan, secret_token: '123' }, 'unknown field: secret_token'],
  ])('malformed body (%s) rejected with 400', async (_desc, malformedBody, expectedError) => {
    const deps = mockScanDeps();
    const result = await handleScans(deps, malformedBody, DEV_CTX);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: expectedError });
    expect(deps.insertScan).not.toHaveBeenCalled();
  });

  test('dependency failure sanitization: internal details never leaked', async () => {
    const leakMessage = 'postgres://admin:supersecret@db-cluster.internal:5432/prutas timed out';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = mockScanDeps({
      insertScan: async () => {
        throw new Error(leakMessage);
      },
    });

    const result = await handleScans(deps, baseScan, DEV_CTX);

    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: 'upstream unavailable' });
    expect(JSON.stringify(result.body)).not.toContain('supersecret');
    expect(JSON.stringify(result.body)).not.toContain('db-cluster');
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('supersecret');
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('db-cluster');
    errorSpy.mockRestore();
  });
});

// ============================================================================
// Conversations Adversarial & Concurrency Suite
// ============================================================================
describe('Conversations Ownership & Security', () => {
  const baseConv = {
    uuid: '11111111-1111-4111-8111-111111111111',
    title: 'Banana Plantation Guide',
    created_at: '2026-09-19T08:00:00.000Z',
    updated_at: '2026-09-19T08:00:00.000Z',
    deleted_at: null,
  };

  function mockConvDeps(overrides: {
    userId?: string | null;
    existingOwner?: string | null;
    ownerOfConversation?: (id: string) => Promise<string | null>;
    upsertConversation?: (row: UpsertableConversation) => Promise<void>;
  } = {}) {
    return {
      limiter: { limit: vi.fn(async () => ({ success: true })) },
      verifyToken: vi.fn(async (_t: string) => overrides.userId !== undefined ? overrides.userId : USER_A),
      ownerOfConversation: vi.fn(overrides.ownerOfConversation ?? (async (_id: string) => overrides.existingOwner !== undefined ? overrides.existingOwner : null)),
      upsertConversation: vi.fn(overrides.upsertConversation ?? (async (_r: UpsertableConversation) => {})),
    };
  }

  test('forged user_id in body is ignored: verified identity from token wins', async () => {
    const deps = mockConvDeps();
    const result = await handleConversations(deps, { ...baseConv, user_id: USER_B }, DEV_CTX);

    expect(result.status).toBe(201);
    expect(deps.upsertConversation).toHaveBeenCalledTimes(1);
    const row = deps.upsertConversation.mock.calls[0][0];
    expect(row.user_id).toBe(USER_A);
    expect(row.user_id).not.toBe(USER_B);
  });

  test('cross-owner conversation replay is rejected with 403', async () => {
    const deps = mockConvDeps({ existingOwner: USER_B });
    const result = await handleConversations(deps, baseConv, DEV_CTX);

    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: 'not your conversation' });
    expect(deps.upsertConversation).not.toHaveBeenCalled();
  });

  test('two callers racing for one new conversation UUID: second receives 403', async () => {
    const deps1 = mockConvDeps({ existingOwner: null });
    const deps2 = mockConvDeps({
      existingOwner: null,
      upsertConversation: async () => {
        throw new OwnershipConflictError('ownership conflict: conversation owned by another account');
      },
    });

    const res1 = await handleConversations(deps1, baseConv, DEV_CTX);
    const res2 = await handleConversations(deps2, baseConv, { ...DEV_CTX, accessToken: 'token-user-b' });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(403);
    expect(res2.body).toEqual({ error: 'not your conversation' });
  });

  test('own-owner idempotent replay updates title and preserves verified owner', async () => {
    const deps = mockConvDeps({ existingOwner: USER_A });
    const result = await handleConversations(deps, { ...baseConv, title: 'Updated Banana Guide' }, DEV_CTX);

    expect(result.status).toBe(201);
    expect(deps.upsertConversation).toHaveBeenCalledTimes(1);
    const row = deps.upsertConversation.mock.calls[0][0];
    expect(row.title).toBe('Updated Banana Guide');
    expect(row.user_id).toBe(USER_A);
  });

  test.each([
    ['missing token', { ...DEV_CTX, accessToken: null }, 401],
    ['invalid token', DEV_CTX, 401, null],
  ])('token variation (%s) returns %i', async (_desc, ctx, expectedStatus, userResult?: string | null) => {
    const deps = mockConvDeps({ userId: userResult !== undefined ? userResult : USER_A });
    const result = await handleConversations(deps, baseConv, ctx);

    expect(result.status).toBe(expectedStatus);
    expect(deps.upsertConversation).not.toHaveBeenCalled();
  });

  test.each([
    ['missing title', { ...baseConv, title: '' }, 'title must be 1-200 characters'],
    ['unknown field', { ...baseConv, admin_flag: true }, 'unknown field: admin_flag'],
    ['invalid uuid', { ...baseConv, uuid: 'invalid' }, 'uuid must be a UUID'],
  ])('malformed conversation body (%s) returns 400', async (_desc, malformed, expectedError) => {
    const deps = mockConvDeps();
    const result = await handleConversations(deps, malformed, DEV_CTX);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: expectedError });
    expect(deps.upsertConversation).not.toHaveBeenCalled();
  });

  test('dependency failure does not leak internal error info', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = mockConvDeps({
      ownerOfConversation: async () => {
        throw new Error('Supabase RPC failure password=12345');
      },
    });

    const result = await handleConversations(deps, baseConv, DEV_CTX);

    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: 'upstream unavailable' });
    expect(JSON.stringify(result.body)).not.toContain('password');
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('password');
    errorSpy.mockRestore();
  });
});

// ============================================================================
// Conversation Messages Adversarial & Concurrency Suite
// ============================================================================
describe('Conversation Messages Ownership & Security', () => {
  const baseMsg = {
    uuid: '22222222-2222-4222-8222-222222222222',
    conversation_id: '11111111-1111-4111-8111-111111111111',
    role: 'user' as const,
    kind: null,
    text: 'What nutrients are recommended?',
    verdict_json: null,
    created_at: '2026-09-19T08:01:00.000Z',
  };

  function mockMsgDeps(overrides: {
    userId?: string | null;
    parentOwner?: string | null;
    messageOwner?: string | null;
    ownerOfConversation?: (id: string) => Promise<string | null>;
    ownerOfMessage?: (id: string) => Promise<string | null>;
    insertMessage?: (row: InsertableMessage) => Promise<void>;
  } = {}) {
    return {
      limiter: { limit: vi.fn(async () => ({ success: true })) },
      verifyToken: vi.fn(async (_t: string) => overrides.userId !== undefined ? overrides.userId : USER_A),
      ownerOfConversation: vi.fn(overrides.ownerOfConversation ?? (async (_id: string) => overrides.parentOwner !== undefined ? overrides.parentOwner : USER_A)),
      ownerOfMessage: vi.fn(overrides.ownerOfMessage ?? (async (_id: string) => overrides.messageOwner !== undefined ? overrides.messageOwner : null)),
      insertMessage: vi.fn(overrides.insertMessage ?? (async (_r: InsertableMessage) => {})),
    };
  }

  test('forged user_id in body is rejected: only verified identity wins', async () => {
    const deps = mockMsgDeps();
    const result = await handleConversationMessages(deps, { ...baseMsg, user_id: USER_B }, DEV_CTX);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: 'unknown field: user_id' });
    expect(deps.insertMessage).not.toHaveBeenCalled();
  });

  test('parent conversation belongs to another owner: rejected with 403', async () => {
    const deps = mockMsgDeps({ parentOwner: USER_B });
    const result = await handleConversationMessages(deps, baseMsg, DEV_CTX);

    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: 'not your conversation' });
    expect(deps.insertMessage).not.toHaveBeenCalled();
  });

  test('existing message belongs to another owner: rejected with 403', async () => {
    const deps = mockMsgDeps({ parentOwner: USER_A, messageOwner: USER_B });
    const result = await handleConversationMessages(deps, baseMsg, DEV_CTX);

    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: 'not your message' });
    expect(deps.insertMessage).not.toHaveBeenCalled();
  });

  test('two callers racing for one new message UUID: atomic conflict returns 403', async () => {
    const deps1 = mockMsgDeps({ messageOwner: null });
    const deps2 = mockMsgDeps({
      messageOwner: null,
      insertMessage: async () => {
        throw new OwnershipConflictError('ownership conflict: message owned by another account');
      },
    });

    const res1 = await handleConversationMessages(deps1, baseMsg, DEV_CTX);
    const res2 = await handleConversationMessages(deps2, baseMsg, { ...DEV_CTX, accessToken: 'token-user-b' });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(403);
    expect(res2.body).toEqual({ error: 'not your message' });
  });

  test('own-owner message rewrite succeeds with verified identity', async () => {
    const deps = mockMsgDeps({ parentOwner: USER_A, messageOwner: USER_A });
    const result = await handleConversationMessages(deps, { ...baseMsg, text: 'Reworded content' }, DEV_CTX);

    expect(result.status).toBe(201);
    expect(deps.insertMessage).toHaveBeenCalledTimes(1);
    const row = deps.insertMessage.mock.calls[0][0];
    expect(row.id).toBe(baseMsg.uuid);
    expect(row.text).toBe('Reworded content');
    expect(row.user_id).toBe(USER_A);
  });

  test.each([
    ['invalid role', { ...baseMsg, role: 'attacker' }, 'role must be user or assistant'],
    ['malformed verdict_json', { ...baseMsg, verdict_json: '{broken' }, 'verdict_json must be valid JSON'],
    ['unknown field', { ...baseMsg, exploit: 1 }, 'unknown field: exploit'],
  ])('malformed message body (%s) returns 400', async (_desc, malformed, expectedError) => {
    const deps = mockMsgDeps();
    const result = await handleConversationMessages(deps, malformed, DEV_CTX);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: expectedError });
    expect(deps.insertMessage).not.toHaveBeenCalled();
  });

  test('dependency failure sanitization: no leak of database error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = mockMsgDeps({
      insertMessage: async () => {
        throw new Error('Connection lost to auth.users with key=sk_service_secret');
      },
    });

    const result = await handleConversationMessages(deps, baseMsg, DEV_CTX);

    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: 'upstream unavailable' });
    expect(JSON.stringify(result.body)).not.toContain('sk_service_secret');
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('sk_service_secret');
    errorSpy.mockRestore();
  });
});

// ============================================================================
// Retired Claim Route Suite
// ============================================================================
describe('Claim Route Fail-Closed Retirement', () => {
  function mockClaimDeps(overrides: { userId?: string | null; allowed?: boolean } = {}) {
    return {
      limiter: { limit: vi.fn(async () => ({ success: overrides.allowed ?? true, retryAfter: 60 })) },
      verifyToken: vi.fn(async (_t: string) => overrides.userId !== undefined ? overrides.userId : USER_A),
      claim: vi.fn(async () => 5),
    };
  }

  test('valid token request fails closed with 410 and never transitions ownership', async () => {
    const deps = mockClaimDeps();
    const result = await handleClaim(deps, { deviceId: 'dev-1', accessToken: 'good-tok', ip: '1.2.3.4' });

    expect(result.status).toBe(410);
    expect(result.body).toEqual({ error: 'claim endpoint deprecated' });
    expect(deps.claim).not.toHaveBeenCalled();
  });

  test('missing or unverified token is refused before 410 evaluation', async () => {
    const deps = mockClaimDeps({ userId: null });
    const resNoToken = await handleClaim(deps, { deviceId: 'dev-1', accessToken: null, ip: '1.2.3.4' });
    const resBadToken = await handleClaim(deps, { deviceId: 'dev-1', accessToken: 'bad', ip: '1.2.3.4' });

    expect(resNoToken.status).toBe(401);
    expect(resBadToken.status).toBe(401);
    expect(deps.claim).not.toHaveBeenCalled();
  });

  test('rate limit is respected before processing claim request', async () => {
    const deps = mockClaimDeps({ allowed: false });
    const result = await handleClaim(deps, { deviceId: 'dev-1', accessToken: 'tok', ip: '1.2.3.4' });

    expect(result.status).toBe(429);
    expect(result.headers?.['Retry-After']).toBe('60');
    expect(deps.verifyToken).not.toHaveBeenCalled();
    expect(deps.claim).not.toHaveBeenCalled();
  });
});
