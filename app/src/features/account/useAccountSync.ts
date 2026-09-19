import { useCallback, useEffect, useState } from 'react';
import {
  currentAccessToken, currentUser, resetPassword,
  restoreSession, resendConfirmation,
  signIn as signInRequest, signOut, signUp as signUpRequest,
} from '../../core/auth/session';
import { authErrorMessage, type AuthErrorKey } from '../../core/auth/authErrors';
import { restoreScans } from '../../core/auth/restore';
import { restoreConversations } from '../../core/auth/restoreConversations';
import { drainScans } from '../../core/sync/drain';
import { drainConversations } from '../../core/sync/drainConversations';
import { apiBaseUrl } from '../../core/chat/apiBaseUrl';
import { deviceId } from '../../core/chat/deviceId';
import { setSyncMode } from '../../core/db/syncMode';
import { pendingScans, resetSyncQueue } from '../../core/db/repositories/scans';
import {
  pendingConversations, pendingMessages,
  resetConversationSyncQueue, resetMessageSyncQueue,
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
  });

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
      setAccount(a => ({ ...a, userId: user.id, email: user.email, accessToken }));
    })();
  }, []);

  // Fire-and-forget drain on data changes: both queues are monitored.
  // On 401: notify once, treat as signed out, leave rows queued locally.
  useEffect(() => {
    void (async () => {
      const scans = await drainScans({
        db,
        baseUrl: apiBaseUrl(),
        deviceId: deviceId(db),
        accessToken: account.accessToken,
      });
      const conversations = await drainConversations({
        db, baseUrl: apiBaseUrl(), deviceId: deviceId(db), accessToken: account.accessToken,
      });
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
  }, [db, dataVersion, account.accessToken]);

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

      resetSyncQueue(db);
      resetConversationSyncQueue(db);
      resetMessageSyncQueue(db);
      const uploadedScans = await drainScans({
        db, baseUrl: apiBaseUrl(), deviceId: deviceId(db), accessToken: outcome.accessToken,
      });
      const uploadedConversations = await drainConversations({
        db, baseUrl: apiBaseUrl(), deviceId: deviceId(db), accessToken: outcome.accessToken,
      });
      const report = await restoreScans({ db });
      await restoreConversations({ db });

      setAccount({
        userId: outcome.userId ?? null,
        email,
        accessToken: outcome.accessToken,
        busy: false,
        error: null,
        errorKey: null,
        resetMessage: null,
        confirmationPendingEmail: null,
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
      await uploadAndRestoreForAccount(email, outcome);
      return;
    }
    if ((outcome as any).ok === true) {
      await uploadAndRestoreForAccount(email, outcome as unknown as { userId?: string; accessToken: string });
      return;
    }
  }, [uploadAndRestoreForAccount, t]);

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
    setAccount(a => ({ ...a, resetMessage: null }));
    await resetPassword(email);
    setAccount(a => ({ ...a, resetMessage: t.resetEmailSent }));
  }, [t]);

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
    });
  }, [db, notify, onSyncModeChange, t]);

  return {
    account,
    openAccount,
    signIn,
    signUp,
    resendConfirmation: resendConfirmationAction,
    continueOffline,
    forgotPassword,
    signOut: signOutOfAccount,
  };
}
