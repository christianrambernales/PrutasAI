/**
 * The ordering the hook's comments promise, asserted rather than read: the
 * mode is recorded before the upload starts, the upload finishes before the
 * restore begins, and a failed sign-in never reaches either.
 */

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useAccountSync } from '../useAccountSync';
import { resetAppDatabase } from '../../../testing/appDatabase';
import { strings } from '../../../ui/i18n/strings';
import { getSyncMode } from '../../../core/db/syncMode';
import type { SqlDriver } from '../../../core/db/driver';

jest.mock('../../../core/auth/session');
jest.mock('../../../core/sync/drain');
jest.mock('../../../core/sync/drainConversations');
jest.mock('../../../core/auth/restore');
jest.mock('../../../core/auth/restoreConversations');

const session = require('../../../core/auth/session');
const drain = require('../../../core/sync/drain');
const drainConv = require('../../../core/sync/drainConversations');
const restore = require('../../../core/auth/restore');
const restoreConv = require('../../../core/auth/restoreConversations');

const t = strings('EN');
let db: SqlDriver;
let order: string[];
/** What the stored sync_mode was at the instant the first real upload began. */
let modeAtFirstUpload: string | null | undefined;

beforeEach(() => {
  db = resetAppDatabase();
  order = [];
  modeAtFirstUpload = undefined;
  jest.resetAllMocks();
  session.currentUser.mockResolvedValue(null);
  session.currentAccessToken.mockResolvedValue('');
  // Both drains honour the token, the way the real ones do: an empty token is
  // offline mode working, not an upload. Without that the drain effect's own
  // signed-out run at mount would be recorded as an upload the app never made.
  drain.drainScans.mockImplementation(async ({ accessToken }: { accessToken: string }) => {
    if (accessToken.trim() !== '') {
      // Read from the real database mid-flight: the mode has to be on disk
      // already, not written once the upload has finished.
      if (modeAtFirstUpload === undefined) modeAtFirstUpload = getSyncMode(db);
      order.push('drainScans');
    }
    return { failed: 0 };
  });
  // Returns a report, as the real drain always has: the hook reads this one
  // now, so a double that resolves to undefined is no longer a stand-in.
  drainConv.drainConversations.mockImplementation(async ({ accessToken }: { accessToken: string }) => {
    if (accessToken.trim() !== '') order.push('drainConversations');
    return { attempted: 0, synced: 0, failed: 0, sessionExpired: false };
  });
  restore.restoreScans.mockImplementation(async () => {
    order.push('restoreScans');
    return { restored: 2, restoreFailed: false };
  });
  restoreConv.restoreConversations.mockImplementation(async () => { order.push('restoreConversations'); });
});

function mount(over: Record<string, unknown> = {}) {
  const notify = jest.fn();
  const push = jest.fn();
  const back = jest.fn();
  const onSyncModeChange = jest.fn();
  const onAccountRequested = jest.fn();
  let value!: ReturnType<typeof useAccountSync>;
  function Host() {
    value = useAccountSync({
      db, t, notify, push, back, consented: true, dataVersion: 0,
      bumpData: jest.fn(), onSyncModeChange, onAccountRequested, ...over,
    } as never);
    return null;
  }
  act(() => { renderer.create(<Host />); });
  return { get value() { return value; }, notify, push, back, onSyncModeChange, onAccountRequested };
}

test('opening the account screen without consent asks for consent instead', () => {
  const h = mount({ consented: false });
  act(() => { h.value.openAccount(); });
  expect(h.onAccountRequested).toHaveBeenCalledTimes(1);
  expect(h.push).not.toHaveBeenCalled();
});

test('opening the account screen with consent navigates there', () => {
  const h = mount();
  act(() => { h.value.openAccount(); });
  expect(h.push).toHaveBeenCalledWith({ name: 'account' });
  expect(h.onAccountRequested).not.toHaveBeenCalled();
});

test('a successful sign-in records the mode first, then uploads before restoring', async () => {
  session.signIn.mockResolvedValue({ ok: true, userId: 'u1', accessToken: 'tok' });
  const h = mount();
  await act(async () => { await h.value.signIn('grower@example.com', 'pw'); });

  expect(getSyncMode(db)).toBe('account');
  expect(h.onSyncModeChange).toHaveBeenCalledWith('account');
  // Recorded *before* the upload started, not merely by the time it finished:
  // the Settings -> Account path arrives with sync_mode still 'offline', and a
  // persisted mode that contradicts what the install is doing is worse than none.
  expect(modeAtFirstUpload).toBe('account');
  // Everything local goes up before any of the account's history comes down.
  // The trailing pair is the drain effect re-running on the token the sign-in
  // just set: real behaviour, and it lands after the restore rather than
  // racing it.
  expect(order).toEqual([
    'drainScans', 'drainConversations', 'restoreScans', 'restoreConversations',
    'drainScans', 'drainConversations',
  ]);
  expect(h.value.account.email).toBe('grower@example.com');
  expect(h.value.account.accessToken).toBe('tok');
  expect(h.value.account.busy).toBe(false);
});

test('a failed sign-in surfaces the error and never uploads', async () => {
  session.signIn.mockResolvedValue({ ok: false, error: 'Invalid login credentials' });
  const h = mount();
  await act(async () => { await h.value.signIn('grower@example.com', 'wrong'); });

  expect(h.value.account.error).toBe('Invalid login credentials');
  expect(h.value.account.email).toBeNull();
  expect(h.value.account.busy).toBe(false);
  expect(order).toEqual([]);
});

test('a restore failure is reported ahead of any restored count', async () => {
  session.signIn.mockResolvedValue({ ok: true, userId: 'u1', accessToken: 'tok' });
  restore.restoreScans.mockImplementation(async () => {
    order.push('restoreScans');
    return { restored: 0, restoreFailed: true };
  });
  const h = mount();
  await act(async () => { await h.value.signIn('grower@example.com', 'pw'); });
  expect(h.notify).toHaveBeenCalledWith(t.historyRestoreFailed);
});

test('signing up pops the sign-up screen once the account exists', async () => {
  session.signUp.mockResolvedValue({ ok: true, userId: 'u1', accessToken: 'tok' });
  const h = mount();
  await act(async () => { await h.value.signUp('new@example.com', 'pw'); });
  expect(h.back).toHaveBeenCalledTimes(1);
});

test('a failed sign-up does not pop the screen', async () => {
  session.signUp.mockResolvedValue({ ok: false, error: 'User already registered' });
  const h = mount();
  await act(async () => { await h.value.signUp('taken@example.com', 'pw'); });
  expect(h.back).not.toHaveBeenCalled();
  expect(h.value.account.error).toBe('User already registered');
});

test('a password reset always reports the same message, told or not', async () => {
  session.resetPassword.mockResolvedValue({ ok: true });
  const h = mount();
  await act(async () => { await h.value.forgotPassword('grower@example.com'); });
  expect(h.value.account.resetMessage).toBe(t.resetEmailSent);
});

/**
 * Either queue can be the one that meets the 401 first, and a drain with
 * nothing pending reports sessionExpired: false straight away. Reading only
 * the scans report therefore left a user with no queued scans but queued
 * conversations signed in against a dead session — the Account screen still
 * showing their email, every upload failing silently behind it.
 */
test('a 401 from the conversations drain alone still signs the user out', async () => {
  session.currentUser.mockResolvedValue({ email: 'grower@example.com' });
  session.currentAccessToken.mockResolvedValue('stale-token');
  session.signOut.mockResolvedValue(undefined);
  drain.drainScans.mockResolvedValue({ failed: 0, sessionExpired: false });
  drainConv.drainConversations.mockResolvedValue({
    attempted: 1, synced: 0, failed: 1, sessionExpired: true,
  });

  const h = mount();
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });

  expect(h.notify).toHaveBeenCalledWith(t.sessionExpired);
  expect(session.signOut).toHaveBeenCalled();
  expect(h.value.account.email).toBeNull();
  expect(h.value.account.accessToken).toBe('');
});
