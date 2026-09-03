/**
 * Sign-up, sign-in and sign-out. No auth code of our own — Supabase Auth
 * handles password hashing, tokens and refresh, which is exactly why it was
 * chosen over the recovery-code scheme it replaced.
 */

import { supabaseClient } from './supabase';

export type AuthOutcome =
  | { ok: true; userId: string; accessToken: string }
  | { ok: false; error: string };

const NOT_CONFIGURED: AuthOutcome = { ok: false, error: 'not configured' };

export async function signUp(email: string, password: string): Promise<AuthOutcome> {
  const supabase = supabaseClient();
  if (!supabase) return NOT_CONFIGURED;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  // A user without a session means confirmation is pending. Reporting that as
  // signed in would show an account UI with no token behind it.
  if (!data.session || !data.user) return { ok: false, error: 'check your email to confirm the account' };

  return { ok: true, userId: data.user.id, accessToken: data.session.access_token };
}

export async function signIn(email: string, password: string): Promise<AuthOutcome> {
  const supabase = supabaseClient();
  if (!supabase) return NOT_CONFIGURED;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  if (!data.session || !data.user) return { ok: false, error: 'sign-in failed' };

  return { ok: true, userId: data.user.id, accessToken: data.session.access_token };
}

/**
 * Requests a password-reset email from Supabase Auth. Always reports success
 * when the request itself succeeded — Supabase does not reveal whether the
 * email belongs to an account, and neither should this app.
 */
export async function resetPassword(email: string): Promise<{ ok: boolean }> {
  const supabase = supabaseClient();
  if (!supabase) return { ok: false };

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { ok: !error };
}

export async function signOut(): Promise<void> {
  const supabase = supabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function currentUser(): Promise<{ id: string; email: string | null } | null> {
  const supabase = supabaseClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
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

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}
