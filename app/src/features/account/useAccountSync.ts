import { useCallback, useEffect, useRef, useState } from 'react';
import {
  currentAccessToken, currentUser, resetPassword, requestPasswordReset,
  restoreSession, resendConfirmation, updateUserPassword,
  signIn as signInRequest, signOut, signUp as signUpRequest,
} from '../../core/auth/session';
import { setupRecoveryListener } from '../../core/auth/recovery';
import { authErrorMessage, type AuthErrorKey } from '../../core/auth/authErrors';
import { restoreScans } from '../../core/auth/restore';
import { restoreConversations } from '../../core/auth/restoreConversations';
import { drainScans } from '../../core/sync/drain';
import { drainConversations } from '../../core/sync/drainConversations';
import { apiBaseUrl } from '../../core/chat/apiBaseUrl';
import { deviceId } from '../../core/chat/deviceId';
import { getSyncMode, setSyncMode } from '../../core/db/syncMode';
import {
  claimUnownedScans, countScansBySyncStatus, pendingScans, removeLocalAccountScans,
} from '../../core/db/repositories/scans';
import {
  claimUnownedConversations, countConversationsBySyncStatus, pendingConversations, pendingMessages,
  removeLocalAccountConversations,
} from '../../core/db/repositories/conversations';
import type { SqlDriver } from '../../core/db/driver';
import type { Route } from '../../navigation/navState';
import type { strings } from '../../ui/i18n/strings';

type Strings = ReturnType<typeof strings>;
type SyncMode = 'offline' | 'account';

export interface AccountState {
  userId: string | null;
  email: string | null;
  accessToken: string;
  busy: boolean;
  error: string | null;
  errorKey: AuthErrorKey | null;
  resetMessage: string | null;
  confirmationPendingEmail: string | null;
  cloudSyncEnabled: boolean;
  unownedClaimPending: { scans: number; conversations: number } | null;
  syncCounts: { pending: number; needsAttention: number; conflicts: number };
  lastSuccessfulSyncAt: string | null;
}

export interface AccountSyncInput {
  db: SqlDriver;
  t: Strings;
  notify: (message: string) => void;
  push: (route: Route) => void;
  back: () => void;
  consented: boolean;
  dataVersion: number;
  bumpData: () => void;
  onSyncModeChange: (mode: SyncMode) => void;
  onAccountRequested: () => void;
}

export interface AccountSync {
  account: AccountState;
  openAccount: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resendConfirmation: (email?: string) => Promise<void>;
  continueOffline: () => void;
  forgotPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  setNewPassword: (password: string) => Promise<{ ok: boolean; errorKey?: AuthErrorKey }>;
  clearRecovery: () => void;
  claimUnowned: () => Promise<void>;
  declineUnowned: () => Promise<void>;
  setCloudSyncEnabled: (enabled: boolean) => void;
  syncNow: () => Promise<void>;
  removeLocalDeviceCopy: () => Promise<void>;
}

export function useAccountSync(input: AccountSyncInput): AccountSync {
  const {
    db, t, notify, push, back, consented, dataVersion, bumpData,
    onSyncModeChange, onAccountRequested,
  } = input;

  const [account, setAccount] = useState<AccountState>({
    userId: null,
    email: null,
    accessToken: '',
    busy: false,
    error: null,
    errorKey: null,
    resetMessage: null,
    confirmationPendingEmail: null,
    // Null is a legacy/unselected value; an authenticated session remains
    // compatible with the previous behavior until the user explicitly pauses.
    cloudSyncEnabled: getSyncMode(db) !== 'offline',
    unownedClaimPending: null,
    syncCounts: { pending: 0, needsAttention: 0, conflicts: 0 },
    lastSuccessfulSyncAt: null,
  });
  const syncEpoch = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSyncCounts = useCallback((ownerId: string | null) => {
    const scope = { activeAccountId: ownerId };
    const scans = countScansBySyncStatus(db, scope);
    const conversations = countConversationsBySyncStatus(db, scope);
    setAccount(a => ({
      ...a,
      syncCounts: {
        pending: scans.pending + conversations.pending,
        needsAttention: scans.needs_attention + conversations.needs_attention,
        conflicts: scans.conflict + conversations.conflict,
      },
    }));
  }, [db]);

  useEffect(() => {
    refreshSyncCounts(account.userId);
  }, [account.userId, dataVersion, refreshSyncCounts]);

  // Recovery deep link listener: routes to resetPassword when valid recovery link arrives
  useEffect(() => {
    const unsubscribe = setupRecoveryListener(() => {
      push({ name: 'resetPassword' });
    });
    return unsubscribe;
  }, [push]);

  // Read once on mount: a valid stored session restores silently.
  // Expired or revoked session notifies once and returns to signed-out offline mode.
  useEffect(() => {
    void (async () => {
      if (typeof restoreSession === 'function') {
        const restored = await restoreSession();
        if (restored && restored.status === 'valid') {
          setAccount(a => ({
            ...a,
            userId: restored.userId,
            email: restored.email,
            accessToken: restored.accessToken,
            cloudSyncEnabled: getSyncMode(db) !== 'offline',
          }));
          return;
        } else if (restored && restored.status === 'expired') {
          notify(t.sessionExpired);
          setSyncMode(db, 'offline');
          onSyncModeChange('offline');
          void signOut().catch(() => {});
          setAccount(a => ({
            ...a,
            userId: null,
            email: null,
            accessToken: '',
            confirmationPendingEmail: null,
          }));
          return;
        }
      }
      const user = await currentUser();
      if (!user) return;
      const accessToken = await currentAccessToken();
      setAccount(a => ({
        ...a, userId: user.id, email: user.email, accessToken,
        cloudSyncEnabled: getSyncMode(db) !== 'offline',
      }));
    })();
  }, []);

  // Fire-and-forget drain on data changes: both queues are monitored.
  // On 401: notify once, treat as signed out, leave rows queued locally.
  useEffect(() => {
    if (!account.userId || !account.cloudSyncEnabled || account.unownedClaimPending) return;
    const epoch = syncEpoch.current;
    void (async () => {
      const scans = await drainScans({
        db,
        baseUrl: apiBaseUrl(),
        deviceId: deviceId(db),
        accessToken: account.accessToken,
        userId: account.userId ?? undefined,
      });
      const conversations = await drainConversations({
        db, baseUrl: apiBaseUrl(), deviceId: deviceId(db), accessToken: account.accessToken, userId: account.userId ?? undefined,
      });
      if (epoch !== syncEpoch.current) return;
      if (!scans.sessionExpired && !conversations.sessionExpired) return;

      notify(t.sessionExpired);
      setSyncMode(db, 'offline');
      onSyncModeChange('offline');
      void signOut().catch(() => {});
      setAccount(a => ({
        ...a,
        userId: null,
        email: null,
        accessToken: '',
        confirmationPendingEmail: null,
      }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, dataVersion, account.accessToken, account.userId, account.cloudSyncEnabled, account.unownedClaimPending]);

  // Persisted `next_retry_at` survives a relaunch; this timer only wakes the
  // current process at the earliest owner-bound time. The queue remains the
  // authority, so a late/cleared timer cannot manufacture an upload.
  useEffect(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    if (!account.userId || !account.cloudSyncEnabled || account.unownedClaimPending) return undefined;
    const row = db.get<{ next_retry_at: string }>(
      `SELECT MIN(next_retry_at) AS next_retry_at FROM (
         SELECT next_retry_at FROM scan WHERE account_id = ? AND sync_status = 'pending' AND next_retry_at IS NOT NULL
         UNION ALL SELECT next_retry_at FROM conversation WHERE account_id = ? AND sync_status = 'pending' AND next_retry_at IS NOT NULL
         UNION ALL SELECT next_retry_at FROM conversation_message WHERE account_id = ? AND sync_status = 'pending' AND next_retry_at IS NOT NULL
       )`,
      [account.userId, account.userId, account.userId],
    );
    const next = row?.next_retry_at ? Date.parse(row.next_retry_at) : NaN;
    if (!Number.isFinite(next)) return undefined;
    const delay = Math.max(0, Math.min(next - Date.now(), 2_147_483_647));
    const owner = account.userId;
    const token = account.accessToken;
    retryTimer.current = setTimeout(() => {
      if (syncEpoch.current < 0) return;
      void drainScans({ db, baseUrl: apiBaseUrl(), deviceId: deviceId(db), accessToken: token, userId: owner });
      void drainConversations({ db, baseUrl: apiBaseUrl(), deviceId: deviceId(db), accessToken: token, userId: owner });
    }, delay);
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = null;
    };
  }, [account.accessToken, account.cloudSyncEnabled, account.unownedClaimPending, account.userId, dataVersion, db]);

  const setCloudSyncEnabled = useCallback((enabled: boolean) => {
    if (!enabled) syncEpoch.current += 1;
    setSyncMode(db, enabled ? 'account' : 'offline');
    onSyncModeChange(enabled ? 'account' : 'offline');
    setAccount(a => ({ ...a, cloudSyncEnabled: enabled }));
  }, [db, onSyncModeChange]);

  const openAccount = useCallback(() => {
    if (!consented) {
      onAccountRequested();
      return;
    }
    push({ name: 'account' });
  }, [consented, push, onAccountRequested]);

  const uploadAndRestoreForAccount = useCallback(
    async (email: string, outcome: { userId?: string; accessToken: string }) => {
      setSyncMode(db, 'account');
      onSyncModeChange('account');

      const uploadedScans = await drainScans({
        db, baseUrl: apiBaseUrl(), deviceId: deviceId(db), accessToken: outcome.accessToken, userId: outcome.userId,
      });
      const uploadedConversations = await drainConversations({
        db, baseUrl: apiBaseUrl(), deviceId: deviceId(db), accessToken: outcome.accessToken, userId: outcome.userId,
      });
      const report = await restoreScans({ db, userId: outcome.userId });
      await restoreConversations({ db, userId: outcome.userId });

      setAccount({
        userId: outcome.userId ?? null,
        email,
        accessToken: outcome.accessToken,
        busy: false,
        error: null,
        errorKey: null,
        resetMessage: null,
        confirmationPendingEmail: null,
        cloudSyncEnabled: true,
        unownedClaimPending: null,
        syncCounts: { pending: 0, needsAttention: 0, conflicts: 0 },
        lastSuccessfulSyncAt: uploadedScans.failed === 0 && uploadedConversations.failed === 0 && !report.restoreFailed
          ? new Date().toISOString()
          : null,
      });
      bumpData();

      const incomplete = uploadedScans.failed > 0
        || uploadedConversations.failed > 0
        || pendingScans(db, 1).length > 0
        || pendingConversations(db, 1).length > 0
        || pendingMessages(db, 1).length > 0;

      if (report.restoreFailed) notify(t.historyRestoreFailed);
      else if (incomplete) notify(t.historyUploadIncomplete);
      else if (report.restored > 0) notify(t.historyRestored(report.restored));
    },
    [db, t, notify, bumpData, onSyncModeChange],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    setAccount(a => ({ ...a, busy: true, error: null, errorKey: null }));
    const outcome = await signInRequest(email, password);

    if (outcome.status === 'error') {
      const msg = authErrorMessage(outcome.errorKey, t);
      setAccount(a => ({
        ...a,
        userId: null,
        email: null,
        busy: false,
        error: msg,
        errorKey: outcome.errorKey,
      }));
      return;
    }

    if (outcome.status === 'authenticated') {
      const unownedScans = pendingScans(db, 50, { activeAccountId: null }).length;
      const unownedConversations = pendingConversations(db, 50, { activeAccountId: null }).length;
      if (unownedScans + unownedConversations > 0) {
        setSyncMode(db, 'account');
        onSyncModeChange('account');
        setAccount(a => ({
          ...a,
          userId: outcome.userId,
          email,
          accessToken: outcome.accessToken,
          busy: false,
          cloudSyncEnabled: true,
          unownedClaimPending: { scans: unownedScans, conversations: unownedConversations },
        }));
        return;
      }
      await uploadAndRestoreForAccount(email, outcome);
      return;
    }
    if ((outcome as any).ok === true) {
      await uploadAndRestoreForAccount(email, outcome as unknown as { userId?: string; accessToken: string });
      return;
    }
  }, [uploadAndRestoreForAccount, t, db, onSyncModeChange]);

  const signUp = useCallback(async (email: string, password: string) => {
    setAccount(a => ({ ...a, busy: true, error: null, errorKey: null }));
    const outcome = await signUpRequest(email, password);

    if (outcome.status === 'error') {
      const msg = authErrorMessage(outcome.errorKey, t);
      setAccount(a => ({
        ...a,
        userId: null,
        email: null,
        busy: false,
        error: msg,
        errorKey: outcome.errorKey,
      }));
      return;
    }

    if (outcome.status === 'confirmation_pending') {
      // D-01: registration with unconfirmed email leaves offline app usable
      // and does not call sync/restore.
      setAccount(a => ({
        ...a,
        busy: false,
        error: null,
        errorKey: null,
        confirmationPendingEmail: outcome.email,
      }));
      return;
    }

    if (outcome.status === 'authenticated') {
      await uploadAndRestoreForAccount(email, outcome);
      back();
      return;
    }
    if ((outcome as any).ok === true) {
      await uploadAndRestoreForAccount(email, outcome as unknown as { userId?: string; accessToken: string });
      back();
      return;
    }
  }, [uploadAndRestoreForAccount, back, t]);

  const resendConfirmationAction = useCallback(async (targetEmail?: string) => {
    const emailToUse = targetEmail ?? account.confirmationPendingEmail ?? account.email;
    if (!emailToUse) return;

    setAccount(a => ({ ...a, busy: true, error: null, errorKey: null, resetMessage: null }));
    const result = await resendConfirmation(emailToUse);
    if (!result.ok) {
      const msg = authErrorMessage(result.errorKey, t);
      setAccount(a => ({
        ...a,
        busy: false,
        error: msg,
        errorKey: result.errorKey,
      }));
      return;
    }

    setAccount(a => ({
      ...a,
      busy: false,
      error: null,
      errorKey: null,
      resetMessage: t.confirmationResent,
    }));
  }, [account.confirmationPendingEmail, account.email, t]);

  const continueOffline = useCallback(() => {
    setAccount(a => ({
      ...a,
      confirmationPendingEmail: null,
      error: null,
      errorKey: null,
      resetMessage: null,
    }));
    back();
  }, [back]);

  const forgotPassword = useCallback(async (email: string) => {
    setAccount(a => ({ ...a, resetMessage: null, error: null, errorKey: null }));
    let outcome: { ok: boolean; errorKey?: AuthErrorKey } | undefined;
    if (typeof requestPasswordReset === 'function') outcome = await requestPasswordReset(email);
    if (!outcome && typeof resetPassword === 'function') outcome = await resetPassword(email);
    if (!outcome) outcome = { ok: true };
    if (!outcome.ok) {
      const errorKey = outcome.errorKey ?? 'unknown';
      const msg = authErrorMessage(errorKey, t);
      setAccount(a => ({
        ...a,
        resetMessage: null,
        error: msg,
        errorKey,
      }));
      return;
    }
    setAccount(a => ({
      ...a,
      resetMessage: t.resetEmailSent,
      error: null,
      errorKey: null,
    }));
  }, [t]);

  const setNewPassword = useCallback(async (password: string) => {
    setAccount(a => ({ ...a, busy: true, error: null, errorKey: null }));
    const outcome = await updateUserPassword(password);
    if (!outcome.ok) {
      const errorKey = outcome.errorKey ?? 'unknown';
      const msg = authErrorMessage(errorKey, t);
      setAccount(a => ({ ...a, busy: false, error: msg, errorKey }));
      return { ok: false, errorKey };
    }
    setAccount(a => ({ ...a, busy: false, error: null, errorKey: null }));
    return { ok: true };
  }, [t]);

  const clearRecovery = useCallback(() => {
    setAccount(a => ({ ...a, error: null, errorKey: null }));
  }, []);

  const signOutOfAccount = useCallback(async () => {
    setAccount(a => ({ ...a, busy: true }));
    const result = await signOut();
    if (result && !result.ok && result.errorKey === 'service_unavailable') {
      const msg = authErrorMessage(result.errorKey, t);
      notify(msg);
      setAccount(a => ({ ...a, busy: false }));
      return;
    }
    setSyncMode(db, 'offline');
    onSyncModeChange('offline');
    setAccount({
      userId: null,
      email: null,
      accessToken: '',
      busy: false,
      error: null,
      errorKey: null,
      resetMessage: null,
      confirmationPendingEmail: null,
      cloudSyncEnabled: false,
      unownedClaimPending: null,
      syncCounts: { pending: 0, needsAttention: 0, conflicts: 0 },
      lastSuccessfulSyncAt: null,
    });
  }, [db, notify, onSyncModeChange, t]);

  const claimUnowned = useCallback(async () => {
    if (!account.userId) return;
    claimUnownedScans(db, account.userId);
    claimUnownedConversations(db, account.userId);
    setAccount(a => ({ ...a, unownedClaimPending: null }));
    bumpData();
    await uploadAndRestoreForAccount(account.email ?? '', {
      userId: account.userId,
      accessToken: account.accessToken,
    });
  }, [account.accessToken, account.email, account.userId, bumpData, db, uploadAndRestoreForAccount]);

  const declineUnowned = useCallback(async () => {
    setAccount(a => ({ ...a, unownedClaimPending: null }));
    if (account.userId && account.cloudSyncEnabled) {
      await uploadAndRestoreForAccount(account.email ?? '', {
        userId: account.userId,
        accessToken: account.accessToken,
      });
    }
  }, [account.accessToken, account.cloudSyncEnabled, account.email, account.userId, uploadAndRestoreForAccount]);

  const syncNow = useCallback(async () => {
    if (!account.userId || !account.cloudSyncEnabled || account.unownedClaimPending) return;
    // Manual retry changes only timing. It neither claims rows nor resets
    // errors/attempt counts, so the diagnostic state remains truthful.
    db.all("UPDATE scan SET next_retry_at = NULL WHERE account_id = ? AND sync_status = 'pending'", [account.userId]);
    db.all("UPDATE conversation SET next_retry_at = NULL WHERE account_id = ? AND sync_status = 'pending'", [account.userId]);
    db.all("UPDATE conversation_message SET next_retry_at = NULL WHERE account_id = ? AND sync_status = 'pending'", [account.userId]);
    await uploadAndRestoreForAccount(account.email ?? '', {
      userId: account.userId,
      accessToken: account.accessToken,
    });
  }, [account.accessToken, account.cloudSyncEnabled, account.email, account.unownedClaimPending, account.userId, db, uploadAndRestoreForAccount]);

  const removeLocalDeviceCopy = useCallback(async () => {
    if (!account.userId) return;
    // These repository calls only delete SQLite rows for the verified owner.
    // They deliberately make no remote request: cloud data remains retained.
    removeLocalAccountScans(db, account.userId);
    removeLocalAccountConversations(db, account.userId);
    bumpData();
    refreshSyncCounts(account.userId);
  }, [account.userId, bumpData, db, refreshSyncCounts]);

  return {
    account,
    openAccount,
    signIn,
    signUp,
    resendConfirmation: resendConfirmationAction,
    continueOffline,
    forgotPassword,
    signOut: signOutOfAccount,
    setNewPassword,
    clearRecovery,
    claimUnowned,
    declineUnowned,
    setCloudSyncEnabled,
    syncNow,
    removeLocalDeviceCopy,
  };
}
