/**
 * The defect this file exists for: a signed-in user's chat messages sat in
 * the local sync queue forever. The drain effect is keyed on `dataVersion`,
 * and sending a message bumped neither that nor the access token, so nothing
 * ever asked the queue to drain. See the 2026-09-03 spec, §1.
 */

import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import type { SqlDriver } from '../../core/db/driver';
import { resetAppDatabase, seedConsent, seedLanguagePicked, seedSyncMode } from '../../testing/appDatabase';
import { press, typeInto } from '../../testing/interaction';
// jest.mock is hoisted above this, so it binds the mock rather than the module.
import { drainConversations } from '../../core/sync/drainConversations';

jest.mock('../../core/sync/drain', () => ({
  drainScans: jest.fn(async () => ({ attempted: 0, synced: 0, failed: 0, sessionExpired: false })),
}));

jest.mock('../../core/sync/drainConversations', () => ({
  drainConversations: jest.fn(async () => ({ attempted: 0, synced: 0, failed: 0, sessionExpired: false })),
}));

jest.mock('../../core/auth/restore', () => ({
  restoreScans: jest.fn(async () => ({ restored: 0, restoreFailed: false })),
}));

jest.mock('../../core/auth/restoreConversations', () => ({
  restoreConversations: jest.fn(async () => {}),
}));

jest.mock('../../core/auth/session', () => ({
  signIn: jest.fn(async () => ({ ok: true, userId: 'u1', accessToken: 'tok-1' })),
  signUp: jest.fn(async () => ({ ok: true, userId: 'u1', accessToken: 'tok-1' })),
  signOut: jest.fn(async () => {}),
  resetPassword: jest.fn(async () => ({ ok: true })),
  currentUser: jest.fn(async () => null),
  currentAccessToken: jest.fn(async () => ''),
}));

const drainConversationsMock = drainConversations as jest.Mock;
let db: SqlDriver;

beforeEach(() => {
  jest.clearAllMocks();
  db = resetAppDatabase();
  seedLanguagePicked();
  seedConsent();
  seedSyncMode('account');
});

async function render(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<AppNavigator />);
  });
  return tree;
}

/** Settings → Account → press "Sign in". The mocked signIn always succeeds. */
async function signInFromSettings(tree: ReactTestRenderer): Promise<void> {
  press(tree, 'Settings');
  press(tree, 'Account');
  await act(async () => { press(tree, 'Sign in'); });
}

test('a message sent by a signed-in user is drained to the server', async () => {
  const tree = await render();
  await signInFromSettings(tree);

  // Signing in drains as part of upload-and-restore. The question is whether
  // *sending* drains, so only calls after this point count.
  const before = drainConversationsMock.mock.calls.length;

  press(tree, 'Chat');
  act(() => {
    typeInto(tree, 'Ask about a fruit, a disease or your location…', 'Anong mga uri ng saging?');
  });
  await act(async () => { press(tree, 'Send'); });
  await act(async () => { await Promise.resolve(); });

  const after = drainConversationsMock.mock.calls.slice(before);
  expect(after.length).toBeGreaterThan(0);
  expect(after[after.length - 1][0].accessToken).toBe('tok-1');
});
