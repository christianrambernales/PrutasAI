import { useCallback, useEffect, useState } from 'react';
import {
  currentAccessToken, currentUser, resetPassword,
  signIn as signInRequest, signOut, signUp as signUpRequest,
} from '../../core/auth/session';
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
  email: string | null;
  accessToken: string;
  busy: boolean;
  error: string | null;
  resetMessage: string | null;
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
  forgotPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAccountSync(input: AccountSyncInput): AccountSync {
  const {
    db, t, notify, push, back, consented, dataVersion, bumpData,
    onSyncModeChange, onAccountRequested,
  } = input;

  const [account, setAccount] = useState<AccountState>({
    email: null, accessToken: '', busy: false, error: null, resetMessage: null,
  });

  // Read once on mount: a session in secure storage survived the last launch.
  useEffect(() => {
    void (async () => {
      const user = await currentUser();
      if (!user) return;
      const accessToken = await currentAccessToken();
      setAccount(a => ({ ...a, email: user.email, accessToken }));
    })();
  }, []);

  // Fire-and-forget in the sense that no screen waits for it, but both reports
  // are read rather than discarded: an expired session used to fail silently on
  // every launch, behind an Account screen still showing the user's email.
  //
  // Both, because either queue can be the one that meets the 401 first. A drain
  // with nothing pending returns sessionExpired: false immediately, so reading
  // only the scans report left a user with no queued scans but queued
  // conversations signed in against a dead session — the same silent failure,
  // one queue over.
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

      // Spec 7's 401 row: notify once, treat as signed out, leave the rows
      // queued. Once, because clearing the token makes the next run of this
      // effect return before it sends anything; queued, because drainScans
      // already declines to mark a 401'd row synced.
      notify(t.sessionExpired);
      void signOut().catch(() => {});
      setAccount(a => ({ ...a, email: null, accessToken: '' }));
    })();
    // t and notify are left out deliberately: this effect uploads, and
    // switching language must not start an upload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, dataVersion, account.accessToken]);

  // Spec 4: the disclosure belongs at the moment upload becomes true, which is
  // also when an offline user reaches Settings -> Account. Holding the request
  // rather than pushing straight through is what puts the consent screen in
  // front of the sign-up form for them.
  const openAccount = useCallback(() => {
    if (!consented) {
      onAccountRequested();
      return;
    }
    push({ name: 'account' });
  }, [consented, push, onAccountRequested]);

  const uploadAndRestoreForAccount = useCallback(
    async (email: string, outcome: { accessToken: string }) => {
      // What this install now does, recorded before it does it. The
      // Settings -> Account path arrives here with sync_mode still 'offline',
      // and a persisted mode that contradicts the behaviour is worse than no
      // mode at all: anything reading it later gets the wrong answer.
      setSyncMode(db, 'account');
      onSyncModeChange('account');

      // Everything local goes up, then the account's history comes down. A
      // failed upload must not trigger a restore that leaves history
      // half-attached, so the order is fixed.
      resetSyncQueue(db);
      resetConversationSyncQueue(db);
      // Messages are re-queued alongside their conversations: uploading the
      // threads without their turns restores empty conversations.
      resetMessageSyncQueue(db);
      const uploadedScans = await drainScans({
        db, baseUrl: apiBaseUrl(), deviceId: deviceId(db), accessToken: outcome.accessToken,
      });
      const uploadedConversations = await drainConversations({
        db, baseUrl: apiBaseUrl(), deviceId: deviceId(db), accessToken: outcome.accessToken,
      });
      const report = await restoreScans({ db });
      await restoreConversations({ db });

      setAccount({ email, accessToken: outcome.accessToken, busy: false, error: null, resetMessage: null });
      bumpData();

      // One notice, worst news first. The upload is bounded by the API's
      // per-device rate limit, so a long local history does not finish in a
      // single sign-in; announcing "restored N" then would report a sync that
      // has not happened. LIMIT 1 is enough here: the question is whether
      // anything is still queued, not how much.
      //
      // Every queue counts, not just scans: a sign-in where the conversations
      // all failed with a 5xx used to report "restored N" as a success.
      const incomplete = uploadedScans.failed > 0
        || uploadedConversations.failed > 0
        || pendingScans(db, 1).length > 0
        || pendingConversations(db, 1).length > 0
        || pendingMessages(db, 1).length > 0;

      if (report.restoreFailed) notify(t.historyRestoreFailed);
      else if (incomplete) notify(t.historyUploadIncomplete);
      else if (report.restored > 0) notify(t.historyRestored(report.restored));
    },
    // bumpData and onSyncModeChange are called in the body, so they belong
    // here: a stale bumpData means the restored history never re-renders.
    [db, t, notify, bumpData, onSyncModeChange],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    setAccount(a => ({ ...a, busy: true, error: null }));
    const outcome = await signInRequest(email, password);

    if (!outcome.ok) {
      setAccount(a => ({ ...a, email: null, busy: false, error: outcome.error }));
      return;
    }

    await uploadAndRestoreForAccount(email, outcome);
  }, [uploadAndRestoreForAccount]);

  const signUp = useCallback(async (email: string, password: string) => {
    setAccount(a => ({ ...a, busy: true, error: null }));
    const outcome = await signUpRequest(email, password);

    if (!outcome.ok) {
      setAccount(a => ({ ...a, email: null, busy: false, error: outcome.error }));
      return;
    }

    await uploadAndRestoreForAccount(email, outcome);
    // Pops the sign-up screen so the user lands back on Account, now showing
    // the signed-in state uploadAndRestoreForAccount just set.
    back();
  }, [uploadAndRestoreForAccount, back]);

  const forgotPassword = useCallback(async (email: string) => {
    setAccount(a => ({ ...a, resetMessage: null }));
    await resetPassword(email);
    setAccount(a => ({ ...a, resetMessage: t.resetEmailSent }));
  }, [t]);

  // The state the signed-out screen reads lives here, so the transition that
  // clears it does too — the same shape the expired-session path above sets,
  // reached deliberately rather than by a 401.
  const signOutOfAccount = useCallback(async () => {
    await signOut();
    setAccount({ email: null, accessToken: '', busy: false, error: null, resetMessage: null });
  }, []);

  return { account, openAccount, signIn, signUp, forgotPassword, signOut: signOutOfAccount };
}
