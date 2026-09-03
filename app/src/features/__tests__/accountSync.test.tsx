/**
 * What signing in *does* to this install: the mode it records, what it tells
 * the user afterwards, and what happens when the session behind it has died.
 *
 * Supabase is not configured under test, so the session, restore and drain
 * modules are replaced here — the point is the navigator's wiring, not theirs.
 */

import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import { getSyncMode } from '../../core/db/syncMode';
import { insertScan } from '../../core/db/repositories/scans';
import {
  insertConversation, insertMessage, pendingConversations, pendingMessages,
} from '../../core/db/repositories/conversations';
import { sampleScan } from '../../core/db/testing/scanFixtures';
import type { SqlDriver } from '../../core/db/driver';
import { resetAppDatabase, seedConsent, seedLanguagePicked, seedSyncMode } from '../../testing/appDatabase';
import { press, textInputs, textOf } from '../../testing/interaction';
// jest.mock is hoisted above this, so it binds the mock rather than the module.
import { resetPassword, signOut } from '../../core/auth/session';

const mockDrain = {
  attempted: 0, synced: 0, failed: 0, sessionExpired: false,
};
const mockRestore = { restored: 0, restoreFailed: false };
const mockSession = { email: null as string | null, accessToken: '' };

jest.mock('../../core/sync/drain', () => ({
  // Honours the token so an unconfigured/signed-out render stays a no-op, the
  // way the real drain does.
  drainScans: jest.fn(async (options: { accessToken: string }) => (
    options.accessToken.trim() === ''
      ? { attempted: 0, synced: 0, failed: 0, sessionExpired: false }
      : { ...mockDrain }
  )),
}));

jest.mock('../../core/auth/restore', () => ({
  restoreScans: jest.fn(async () => ({ ...mockRestore })),
}));

jest.mock('../../core/auth/session', () => ({
  signIn: jest.fn(async () => ({ ok: true, userId: 'u1', accessToken: 'tok-1' })),
  signUp: jest.fn(async () => ({ ok: true, userId: 'u1', accessToken: 'tok-1' })),
  signOut: jest.fn(async () => {}),
  resetPassword: jest.fn(async () => ({ ok: true })),
  currentUser: jest.fn(async () => (
    mockSession.email === null ? null : { id: 'u1', email: mockSession.email }
  )),
  currentAccessToken: jest.fn(async () => mockSession.accessToken),
}));

let db: SqlDriver;

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockDrain, { attempted: 0, synced: 0, failed: 0, sessionExpired: false });
  Object.assign(mockRestore, { restored: 0, restoreFailed: false });
  Object.assign(mockSession, { email: null, accessToken: '' });
  db = resetAppDatabase();
  seedLanguagePicked();
  seedConsent();
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

test('signing in from Settings records the account mode an offline install now runs in', async () => {
  seedSyncMode('offline');
  const tree = await render();

  expect(getSyncMode(db)).toBe('offline');
  await signInFromSettings(tree);

  // sync_mode used to stay 'offline' forever while the install uploaded on
  // every launch — a persisted value that was an active lie.
  expect(getSyncMode(db)).toBe('account');
});

test('signing up records the account mode too, whichever entry point was used', async () => {
  seedSyncMode('offline');
  const tree = await render();

  press(tree, 'Settings');
  press(tree, 'Account');
  press(tree, 'New here? Create an account');
  await act(async () => { press(tree, 'Create account'); });

  expect(getSyncMode(db)).toBe('account');
});

test('a sign-in that left rows queued does not claim the history was restored', async () => {
  // The drain is bounded by the API's per-device rate limit, so a long local
  // history does not go up in one sign-in. Saying "restored 3" then reports a
  // sync that has not happened.
  seedSyncMode('offline');
  insertScan(db, sampleScan({ uuid: 'still-pending', syncedAt: null }));
  mockRestore.restored = 3;

  const tree = await render();
  await signInFromSettings(tree);

  const content = textOf(tree.root);
  expect(content).toContain('Some scans have not been uploaded yet');
  expect(content).not.toContain('3 scans restored');
});

test('a sign-in with a failed upload says so rather than reporting success', async () => {
  seedSyncMode('offline');
  mockDrain.failed = 1;
  mockRestore.restored = 2;

  const tree = await render();
  await signInFromSettings(tree);

  expect(textOf(tree.root)).toContain('Some scans have not been uploaded yet');
});

test('a sign-in that fully drained still reports what was restored', async () => {
  seedSyncMode('offline');
  mockRestore.restored = 2;

  const tree = await render();
  await signInFromSettings(tree);

  // Nothing pending and nothing failed: the honest signal is the good one.
  expect(textOf(tree.root)).toContain('2 scans restored');
});

test('an expired session is announced and the account treated as signed out', async () => {
  // A relaunch with a stale session in secure storage: the drain 401s, and
  // before this the failure was silent on every launch, forever, behind an
  // Account screen still showing the user's email.
  seedSyncMode('account');
  mockSession.email = 'grower@example.test';
  mockSession.accessToken = 'stale-token';
  mockDrain.failed = 1;
  mockDrain.sessionExpired = true;

  const tree = await render();
  await act(async () => {});

  expect(textOf(tree.root)).toContain('Your session expired.');
  expect(signOut).toHaveBeenCalled();

  press(tree, 'Settings');
  press(tree, 'Account');
  // Signed out means the screen offers sign-in again, not the stale email.
  const content = textOf(tree.root);
  expect(content).not.toContain('grower@example.test');
  expect(content).toContain('Sign in and your scan history follows you');
});

test('a live session is left alone', async () => {
  seedSyncMode('account');
  mockSession.email = 'grower@example.test';
  mockSession.accessToken = 'good-token';

  const tree = await render();
  await act(async () => {});

  expect(textOf(tree.root)).not.toContain('Your session expired.');
  expect(signOut).not.toHaveBeenCalled();
});

test('forgot password sends a reset request and shows a neutral confirmation', async () => {
  seedSyncMode('offline');
  const tree = await render();
  press(tree, 'Settings');
  press(tree, 'Account');

  const emailField = textInputs(tree).find(n => n.props.accessibilityLabel === 'Email');
  await act(async () => { emailField!.props.onChangeText('grower@example.test'); });
  await act(async () => { press(tree, 'Forgot password?'); });

  expect(resetPassword).toHaveBeenCalledWith('grower@example.test');
  expect(textOf(tree.root)).toContain('If an account exists for that email, a reset link has been sent.');
});

/**
 * Everything local goes up on sign-in, and a conversation without its turns
 * is not "everything": re-queueing the conversation rows while leaving the
 * message rows marked synced uploads a set of empty threads to the new
 * account.
 */
test('signing in re-queues stored messages, not just the conversations holding them', async () => {
  seedSyncMode('offline');
  const when = '2026-08-30T12:00:00.000Z';
  insertConversation(db, {
    uuid: 'c1', title: 'Banana care', deviceId: 'dev-1',
    createdAt: when, updatedAt: when, syncedAt: when,
  });
  insertMessage(db, {
    uuid: 'm1', conversationId: 'c1', role: 'user', kind: null,
    text: 'hi', verdictJson: null, createdAt: when, syncedAt: when,
  });
  expect(pendingMessages(db, 50)).toHaveLength(0);

  const tree = await render();
  await signInFromSettings(tree);

  expect(pendingConversations(db, 50).map(c => c.uuid)).toEqual(['c1']);
  expect(pendingMessages(db, 50).map(m => m.uuid)).toEqual(['m1']);
});
