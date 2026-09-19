/**
 * Sign-up, sign-in, session restore and sign-out.
 * Supabase Auth handles password hashing, tokens and refresh.
 * Provider errors are sanitized through mapAuthError before reaching any caller.
 */

import { supabaseClient } from './supabase';
import { mapAuthError, type AuthErrorKey } from './authErrors';

export type AuthOutcome =
  | { status: 'authenticated'; ok: true; userId: string; accessToken: string }
  | { status: 'confirmation_pending'; ok: false; email: string }
  | { status: 'error'; ok: false; errorKey: AuthErrorKey };

export type ResendOutcome =
  | { ok: true }
  | { ok: false; errorKey: AuthErrorKey };

export type SignOutOutcome =
  | { ok: true }
  | { ok: false; errorKey: AuthErrorKey };

export type SessionRestoreResult =
  | { status: 'no_session' }
  | { status: 'valid'; userId: string; email: string | null; accessToken: string }
  | { status: 'expired' }
  | { status: 'provider_outage' };

const NOT_CONFIGURED: AuthOutcome = {
  status: 'error',
  ok: false,
  errorKey: 'service_unavailable',
};

export async function signUp(email: string, password: string): Promise<AuthOutcome> {
  const supabase = supabaseClient();
  if (!supabase) return NOT_CONFIGURED;

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { status: 'error', ok: false, errorKey: mapAuthError(error) };
    if (!data.user) return { status: 'error', ok: false, errorKey: 'unknown' };

    // A user without a session means email confirmation is pending.
    // D-01: unconfirmed registration leaves offline app usable and never returns a sync token.
    if (!data.session) {
      return { status: 'confirmation_pending', ok: false, email: data.user.email ?? email };
    }

    return {
      status: 'authenticated',
      ok: true,
      userId: data.user.id,
      accessToken: data.session.access_token,
    };
  } catch (err) {
    return { status: 'error', ok: false, errorKey: mapAuthError(err) };
  }
}

export async function signIn(email: string, password: string): Promise<AuthOutcome> {
  const supabase = supabaseClient();
  if (!supabase) return NOT_CONFIGURED;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { status: 'error', ok: false, errorKey: mapAuthError(error) };
    if (!data.session || !data.user) {
      return { status: 'error', ok: false, errorKey: 'invalid_credentials' };
    }

    return {
      status: 'authenticated',
      ok: true,
      userId: data.user.id,
      accessToken: data.session.access_token,
    };
  } catch (err) {
    return { status: 'error', ok: false, errorKey: mapAuthError(err) };
  }
}

/**
 * Resends a confirmation email through Supabase Auth.
 * Safe typed outcome ensures no token or account existence clues leak.
 */
export async function resendConfirmation(email: string): Promise<ResendOutcome> {
  const supabase = supabaseClient();
  if (!supabase) return { ok: false, errorKey: 'service_unavailable' };

  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) {
      return { ok: false, errorKey: mapAuthError(error) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: mapAuthError(err) };
  }
}

/**
 * Requests a password-reset email from Supabase Auth. Always reports success
 * when the request itself succeeded — Supabase does not reveal whether the
 * email belongs to an account, and neither should this app.
 */
export async function resetPassword(email: string): Promise<{ ok: boolean }> {
  const supabase = supabaseClient();
  if (!supabase) return { ok: false };

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

/**
 * Signs out the current user via Supabase Auth.
 * Awaits Supabase sign out and reports safe outcome without throwing.
 */
export async function signOut(): Promise<SignOutOutcome> {
  const supabase = supabaseClient();
  if (!supabase) return { ok: false, errorKey: 'service_unavailable' };

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { ok: false, errorKey: mapAuthError(error) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: mapAuthError(err) };
  }
}

/**
 * Restores the stored session on mount or relaunch.
 * Distinguishes between valid session, no session, expired/revoked session, and provider outage.
 */
export async function restoreSession(): Promise<SessionRestoreResult> {
  const supabase = supabaseClient();
  if (!supabase) return { status: 'no_session' };

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      const errorKey = mapAuthError(sessionError);
      if (errorKey === 'network_error' || errorKey === 'service_unavailable') {
        return { status: 'provider_outage' };
      }
      return { status: 'expired' };
    }

    if (!sessionData?.session) {
      return { status: 'no_session' };
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      const errorKey = mapAuthError(userError);
      if (errorKey === 'network_error' || errorKey === 'service_unavailable') {
        return { status: 'provider_outage' };
      }
      return { status: 'expired' };
    }

    if (!userData?.user) {
      return { status: 'expired' };
    }

    return {
      status: 'valid',
      userId: userData.user.id,
      email: userData.user.email ?? sessionData.session.user?.email ?? null,
      accessToken: sessionData.session.access_token,
    };
  } catch (err) {
    const errorKey = mapAuthError(err);
    if (errorKey === 'network_error' || errorKey === 'service_unavailable') {
      return { status: 'provider_outage' };
    }
    return { status: 'expired' };
  }
}

export async function currentUser(): Promise<{ id: string; email: string | null } | null> {
  const supabase = supabaseClient();
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

/**
 * The stored session's access token, or '' when signed out.
 *
 * Needed on relaunch: the session survives in secure storage, but the token
 * lives only in memory until something asks for it, and the drain needs it.
 */
export async function currentAccessToken(): Promise<string> {
  const supabase = supabaseClient();
  if (!supabase) return '';

  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  } catch {
    return '';
  }
}
