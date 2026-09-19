/**
 * The ordering the hook promises, asserted rather than read:
 * mode is recorded before upload starts, upload finishes before restore begins,
 * failed sign-in or unconfirmed sign-up never reaches either,
 * valid sessions restore silently, expired sessions degrade to offline with local data intact.
 */

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useAccountSync } from '../useAccountSync';
import { resetAppDatabase } from '../../../testing/appDatabase';
import { strings } from '../../../ui/i18n/strings';
import { getSyncMode } from '../../../core/db/syncMode';
import { insertScan } from '../../../core/db/repositories/scans';
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
  session.restoreSession.mockResolvedValue({ status: 'no_session' });
  session.signOut.mockResolvedValue({ ok: true });
  session.resendConfirmation.mockResolvedValue({ ok: true });
  session.resetPassword.mockResolvedValue({ ok: true });
  session.requestPasswordReset.mockResolvedValue({ ok: true });
  session.updateUserPassword.mockResolvedValue({ ok: true });

  // Both drains honour the token, the way the real ones do: an empty token is
  // offline mode working, not an upload.
  drain.drainScans.mockImplementation(async ({ accessToken }: { accessToken: string }) => {
    if (accessToken && accessToken.trim() !== '') {
      if (modeAtFirstUpload === undefined) modeAtFirstUpload = getSyncMode(db);
      order.push('drainScans');
    }
    return { failed: 0 };
  });

  drainConv.drainConversations.mockImplementation(async ({ accessToken }: { accessToken: string }) => {
    if (accessToken && accessToken.trim() !== '') order.push('drainConversations');
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

test('a confirmed sign-in waits for an explicit decision before claiming unowned rows', async () => {
  insertScan(db, {
    uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', imageUri: 'file:///local.jpg',
    createdAt: '2026-09-19T12:00:00.000Z', fruitKey: null, fruitConf: null,
    varietyKey: null, varietyConf: null, bboxJson: null, manifestVersion: null,
    lat: null, lon: null, isOwnedPhoto: true,
  });
  session.signIn.mockResolvedValue({ status: 'authenticated', ok: true, userId: 'account-a', accessToken: 'token-a' });
  const h = mount();

  await act(async () => { await h.value.signIn('a@example.test', 'password'); });

  expect(h.value.account.unownedClaimPending).toEqual({ scans: 1, conversations: 0 });
  expect(db.get<{ account_id: string | null }>('SELECT account_id FROM scan')?.account_id).toBeNull();
  expect(drain.drainScans).not.toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'token-a' }));
});

test('accepting the explicit claim binds only unowned rows to the verified account', async () => {
  insertScan(db, {
    uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', imageUri: 'file:///local.jpg',
    createdAt: '2026-09-19T12:00:00.000Z', fruitKey: null, fruitConf: null,
    varietyKey: null, varietyConf: null, bboxJson: null, manifestVersion: null,
    lat: null, lon: null, isOwnedPhoto: true,
  });
  session.signIn.mockResolvedValue({ status: 'authenticated', ok: true, userId: 'account-a', accessToken: 'token-a' });
  const h = mount();
  await act(async () => { await h.value.signIn('a@example.test', 'password'); });
  await act(async () => { await h.value.claimUnowned(); });

  expect(db.get<{ account_id: string | null }>('SELECT account_id FROM scan')?.account_id).toBe('account-a');
  expect(h.value.account.unownedClaimPending).toBeNull();
});

test('a successful sign-in records the mode first, then uploads before restoring', async () => {
  session.signIn.mockResolvedValue({ status: 'authenticated', ok: true, userId: 'u1', accessToken: 'tok' });
  const h = mount();
  await act(async () => { await h.value.signIn('grower@example.com', 'pw'); });

  expect(getSyncMode(db)).toBe('account');
  expect(h.onSyncModeChange).toHaveBeenCalledWith('account');
  expect(modeAtFirstUpload).toBe('account');
  expect(order).toEqual([
    'drainScans', 'drainConversations', 'restoreScans', 'restoreConversations',
    'drainScans', 'drainConversations',
  ]);
  expect(h.value.account.userId).toBe('u1');
  expect(h.value.account.email).toBe('grower@example.com');
  expect(h.value.account.accessToken).toBe('tok');
  expect(h.value.account.busy).toBe(false);
});

test('a failed sign-in surfaces the safe error and never uploads', async () => {
  session.signIn.mockResolvedValue({ status: 'error', ok: false, errorKey: 'invalid_credentials' });
  const h = mount();
  await act(async () => { await h.value.signIn('grower@example.com', 'wrong'); });

  expect(h.value.account.errorKey).toBe('invalid_credentials');
  expect(h.value.account.error).toBe(t.authErrorInvalidCredentials);
  expect(h.value.account.email).toBeNull();
  expect(h.value.account.busy).toBe(false);
  expect(order).toEqual([]);
});

test('a restore failure is reported ahead of any restored count', async () => {
  session.signIn.mockResolvedValue({ status: 'authenticated', ok: true, userId: 'u1', accessToken: 'tok' });
  restore.restoreScans.mockImplementation(async () => {
    order.push('restoreScans');
    return { restored: 0, restoreFailed: true };
  });
  const h = mount();
  await act(async () => { await h.value.signIn('grower@example.com', 'pw'); });
  expect(h.notify).toHaveBeenCalledWith(t.historyRestoreFailed);
});

test('signing up with immediate session pops the sign-up screen once the account exists', async () => {
  session.signUp.mockResolvedValue({ status: 'authenticated', ok: true, userId: 'u1', accessToken: 'tok' });
  const h = mount();
  await act(async () => { await h.value.signUp('new@example.com', 'pw'); });
  expect(h.back).toHaveBeenCalledTimes(1);
});

test('a failed sign-up does not pop the screen and surfaces safe error', async () => {
  session.signUp.mockResolvedValue({ status: 'error', ok: false, errorKey: 'weak_password' });
  const h = mount();
  await act(async () => { await h.value.signUp('taken@example.com', 'pw'); });
  expect(h.back).not.toHaveBeenCalled();
  expect(h.value.account.errorKey).toBe('weak_password');
  expect(h.value.account.error).toBe(t.authErrorWeakPassword);
});

test('registration with an unconfirmed email leaves offline app usable and does not upload or restore (D-01)', async () => {
  session.signUp.mockResolvedValue({
    status: 'confirmation_pending',
    ok: false,
    email: 'unconfirmed@example.test',
  });
  const h = mount();
  await act(async () => { await h.value.signUp('unconfirmed@example.test', 'secret123'); });

  // Screen is NOT popped, sync is NOT initiated, mode remains offline
  expect(h.back).not.toHaveBeenCalled();
  expect(getSyncMode(db)).not.toBe('account');
  expect(h.onSyncModeChange).not.toHaveBeenCalled();
  expect(order).toEqual([]);
  expect(h.value.account.confirmationPendingEmail).toBe('unconfirmed@example.test');
  expect(h.value.account.accessToken).toBe('');
  expect(h.value.account.userId).toBeNull();
});

test('resend confirmation invokes session wrapper and updates resetMessage safely (D-01)', async () => {
  session.signUp.mockResolvedValue({
    status: 'confirmation_pending',
    ok: false,
    email: 'unconfirmed@example.test',
  });
  session.resendConfirmation.mockResolvedValue({ ok: true });
  const h = mount();
  await act(async () => { await h.value.signUp('unconfirmed@example.test', 'secret123'); });

  await act(async () => { await h.value.resendConfirmation(); });

  expect(session.resendConfirmation).toHaveBeenCalledWith('unconfirmed@example.test');
  expect(h.value.account.resetMessage).toBe(t.confirmationResent);
  expect(h.value.account.error).toBeNull();
});

test('resend confirmation handles rate limit safely without exposing clues (D-01, D-04)', async () => {
  session.signUp.mockResolvedValue({
    status: 'confirmation_pending',
    ok: false,
    email: 'unconfirmed@example.test',
  });
  session.resendConfirmation.mockResolvedValue({ ok: false, errorKey: 'rate_limit' });
  const h = mount();
  await act(async () => { await h.value.signUp('unconfirmed@example.test', 'secret123'); });

  await act(async () => { await h.value.resendConfirmation(); });

  expect(h.value.account.errorKey).toBe('rate_limit');
  expect(h.value.account.error).toBe(t.authErrorRateLimit);
});

test('continueOffline clears confirmation pending prompt and returns via navigation (D-01)', async () => {
  session.signUp.mockResolvedValue({
    status: 'confirmation_pending',
    ok: false,
    email: 'unconfirmed@example.test',
  });
  const h = mount();
  await act(async () => { await h.value.signUp('unconfirmed@example.test', 'secret123'); });

  expect(h.value.account.confirmationPendingEmail).toBe('unconfirmed@example.test');

  act(() => { h.value.continueOffline(); });

  expect(h.value.account.confirmationPendingEmail).toBeNull();
  expect(h.back).toHaveBeenCalledTimes(1);
});

test('a valid stored session restores silently on mount with userId, email and token (D-03)', async () => {
  session.restoreSession.mockResolvedValue({
    status: 'valid',
    userId: 'u1',
    email: 'grower@example.com',
    accessToken: 'valid-tok',
  });
  const h = mount();
  await act(async () => { await Promise.resolve(); });

  expect(h.value.account.userId).toBe('u1');
  expect(h.value.account.email).toBe('grower@example.com');
  expect(h.value.account.accessToken).toBe('valid-tok');
  expect(h.notify).not.toHaveBeenCalled();
});

test('an expired stored session notifies once and returns to signed-out offline mode without touching local data (D-03)', async () => {
  session.restoreSession.mockResolvedValue({ status: 'expired' });
  session.signOut.mockResolvedValue({ ok: true });
  const h = mount();
  await act(async () => { await Promise.resolve(); });

  expect(h.notify).toHaveBeenCalledWith(t.sessionExpired);
  expect(session.signOut).toHaveBeenCalled();
  expect(getSyncMode(db)).not.toBe('account');
  expect(h.value.account.userId).toBeNull();
  expect(h.value.account.email).toBeNull();
  expect(h.value.account.accessToken).toBe('');
});

test('signing out clears session and scope, sets offline mode, and preserves SQLite rows and pending work (D-03, D-06)', async () => {
  session.restoreSession.mockResolvedValue({
    status: 'valid',
    userId: 'u1',
    email: 'grower@example.com',
    accessToken: 'valid-tok',
  });
  session.signOut.mockResolvedValue({ ok: true });
  const h = mount();
  await act(async () => { await Promise.resolve(); });

  await act(async () => { await h.value.signOut(); });

  expect(session.signOut).toHaveBeenCalled();
  expect(getSyncMode(db)).not.toBe('account');
  expect(h.onSyncModeChange).toHaveBeenCalledWith('offline');
  expect(h.value.account.userId).toBeNull();
  expect(h.value.account.email).toBeNull();
  expect(h.value.account.accessToken).toBe('');
});

test('signing out exposes safe failure if provider has an outage', async () => {
  session.signOut.mockResolvedValue({ ok: false, errorKey: 'service_unavailable' });
  const h = mount();
  await act(async () => { await h.value.signOut(); });

  expect(h.notify).toHaveBeenCalledWith(t.authErrorServiceUnavailable);
});

test('a password reset always reports the same message, told or not', async () => {
  session.resetPassword.mockResolvedValue({ ok: true });
  const h = mount();
  await act(async () => { await h.value.forgotPassword('grower@example.com'); });
  expect(h.value.account.resetMessage).toBe(t.resetEmailSent);
});

test('a 401 from the conversations drain alone still signs the user out', async () => {
  session.restoreSession.mockResolvedValue({
    status: 'valid',
    userId: 'u1',
    email: 'grower@example.com',
    accessToken: 'stale-token',
  });
  session.currentUser.mockResolvedValue({ email: 'grower@example.com' });
  session.currentAccessToken.mockResolvedValue('stale-token');
  session.signOut.mockResolvedValue({ ok: true });
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

test('forgotPassword surfaces rate_limit safe error', async () => {
  session.requestPasswordReset.mockResolvedValue({ ok: false, errorKey: 'rate_limit' });
  const h = mount();
  await act(async () => { await h.value.forgotPassword('grower@example.com'); });
  expect(h.value.account.error).toBe(t.authErrorRateLimit);
  expect(h.value.account.errorKey).toBe('rate_limit');
  expect(h.value.account.resetMessage).toBeNull();
});

test('forgotPassword surfaces network safe error', async () => {
  session.requestPasswordReset.mockResolvedValue({ ok: false, errorKey: 'network_error' });
  const h = mount();
  await act(async () => { await h.value.forgotPassword('grower@example.com'); });
  expect(h.value.account.error).toBe(t.authErrorNetwork);
  expect(h.value.account.errorKey).toBe('network_error');
  expect(h.value.account.resetMessage).toBeNull();
});

test('setNewPassword updates password via session and clears errors on success', async () => {
  session.updateUserPassword.mockResolvedValue({ ok: true });
  const h = mount();
  let result: any;
  await act(async () => {
    result = await h.value.setNewPassword('newPassword123');
  });
  expect(session.updateUserPassword).toHaveBeenCalledWith('newPassword123');
  expect(result).toEqual({ ok: true });
  expect(h.value.account.error).toBeNull();
  expect(h.value.account.errorKey).toBeNull();
});

test('setNewPassword maps weak_password error safely', async () => {
  session.updateUserPassword.mockResolvedValue({ ok: false, errorKey: 'weak_password' });
  const h = mount();
  let result: any;
  await act(async () => {
    result = await h.value.setNewPassword('123');
  });
  expect(result).toEqual({ ok: false, errorKey: 'weak_password' });
  expect(h.value.account.error).toBe(t.authErrorWeakPassword);
  expect(h.value.account.errorKey).toBe('weak_password');
});

test('clearRecovery clears error and errorKey', async () => {
  session.updateUserPassword.mockResolvedValue({ ok: false, errorKey: 'weak_password' });
  const h = mount();
  await act(async () => {
    await h.value.setNewPassword('123');
  });
  expect(h.value.account.errorKey).toBe('weak_password');

  act(() => {
    h.value.clearRecovery();
  });
  expect(h.value.account.error).toBeNull();
  expect(h.value.account.errorKey).toBeNull();
});
