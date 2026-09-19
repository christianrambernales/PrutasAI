/**
 * Password recovery link handling and listener orchestration.
 * Handles cold-start (getInitialURL) and foreground (addEventListener) links.
 * Accepts only recovery type for the reset-password route.
 * Supports Supabase PKCE code exchange and token fragments.
 * Never leaks raw tokens or URLs to UI, navigation, or logs.
 */

import { Linking, Platform } from 'react-native';
import { supabaseClient } from './supabase';
import { mapAuthError, type AuthErrorKey } from './authErrors';

export type RequestPasswordResetOutcome =
  | { ok: true }
  | { ok: false; errorKey: AuthErrorKey };

/**
 * Returns the platform-specific redirect URL for password recovery.
 * Android/native uses the prutasai:// custom scheme; web uses origin fallback.
 */
export function getRecoveryRedirectUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/reset-password`;
    }
    return 'https://prutasai.app/reset-password';
  }
  return 'prutasai://reset-password';
}

interface ParsedRecoveryParams {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Parses and validates whether a URL is a valid password recovery link.
 * Rejects malformed, incomplete, or non-recovery URLs.
 */
export function isRecoveryUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Validate scheme: prutasai or http/https
    if (parsed.protocol !== 'prutasai:' && parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    // Validate expected reset route
    const isResetRoute =
      parsed.hostname === 'reset-password' ||
      parsed.pathname === '/reset-password' ||
      parsed.pathname.endsWith('/reset-password');

    if (!isResetRoute) {
      return false;
    }

    // Parse query params and hash fragment params
    const queryParams = parsed.searchParams;
    const hashParams = parsed.hash && parsed.hash.length > 1
      ? new URLSearchParams(parsed.hash.slice(1))
      : new URLSearchParams();

    // Reject URLs with error indicators
    if (queryParams.has('error') || hashParams.has('error')) {
      return false;
    }

    // Validate recovery type if type is specified
    const type = queryParams.get('type') || hashParams.get('type');
    if (type && type !== 'recovery') {
      return false;
    }

    // Check for PKCE code or token fragments
    const code = queryParams.get('code') || hashParams.get('code');
    const accessToken = hashParams.get('access_token') || queryParams.get('access_token');

    if (code && code.trim() !== '') {
      return true;
    }

    if (accessToken && accessToken.trim() !== '') {
      // For token fragments, recovery type must be explicit
      if (type === 'recovery') {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function extractRecoveryParams(url: string): ParsedRecoveryParams | null {
  if (!isRecoveryUrl(url)) return null;

  try {
    const parsed = new URL(url);
    const queryParams = parsed.searchParams;
    const hashParams = parsed.hash && parsed.hash.length > 1
      ? new URLSearchParams(parsed.hash.slice(1))
      : new URLSearchParams();

    const code = queryParams.get('code') || hashParams.get('code');
    const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

    return {
      code: code ? code.trim() : null,
      accessToken: accessToken ? accessToken.trim() : null,
      refreshToken: refreshToken ? refreshToken.trim() : null,
    };
  } catch {
    return null;
  }
}

/**
 * Handles a recovery deep link by establishing the Supabase recovery session.
 * Notifies onRecoveryReady only when Supabase accepts the tokens/code.
 * Never passes raw tokens or URLs to the callback.
 */
export async function handleRecoveryUrl(
  url: string | null | undefined,
  onRecoveryReady?: () => void,
): Promise<{ ok: boolean }> {
  if (!url) return { ok: false };

  const params = extractRecoveryParams(url);
  if (!params) return { ok: false };

  const supabase = supabaseClient();
  if (!supabase) return { ok: false };

  try {
    if (params.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error || !data.session) {
        return { ok: false };
      }
    } else if (params.accessToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken || '',
      });
      if (error || !data.session) {
        return { ok: false };
      }
    } else {
      return { ok: false };
    }

    if (onRecoveryReady) {
      onRecoveryReady();
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Sets up listeners for both cold-start and foreground password recovery links.
 * Returns an unsubscribe cleanup function that removes the listener.
 */
export function setupRecoveryListener(onRecoveryReady: () => void): () => void {
  // Cold start link handling
  try {
    const initialPromise = Linking.getInitialURL?.();
    if (initialPromise && typeof initialPromise.then === 'function') {
      initialPromise
        .then(url => {
          if (url && isRecoveryUrl(url)) {
            void handleRecoveryUrl(url, onRecoveryReady);
          }
        })
        .catch(() => {});
    }
  } catch {}

  // Foreground / warm link handling
  let subscription: { remove: () => void } | undefined;
  try {
    subscription = Linking.addEventListener?.('url', event => {
      if (event?.url && isRecoveryUrl(event.url)) {
        void handleRecoveryUrl(event.url, onRecoveryReady);
      }
    });
  } catch {}

  return () => {
    subscription?.remove?.();
  };
}

/**
 * Requests a password reset email from Supabase Auth.
 * D-02: Returns the same neutral submitted response for existing and unknown accounts.
 * D-04: Returns safe typed error for connectivity, rate limit, and service unavailable failures.
 * Never logs or exposes tokens or raw URLs.
 */
export async function requestPasswordReset(
  email: string,
  redirectTo?: string,
): Promise<RequestPasswordResetOutcome> {
  const supabase = supabaseClient();
  if (!supabase) return { ok: false, errorKey: 'service_unavailable' };

  const targetRedirect = redirectTo ?? getRecoveryRedirectUrl();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: targetRedirect,
    });

    if (error) {
      const errorKey = mapAuthError(error);
      // Surface only safe connectivity, rate limit, or service failures
      if (
        errorKey === 'rate_limit' ||
        errorKey === 'network_error' ||
        errorKey === 'service_unavailable'
      ) {
        return { ok: false, errorKey };
      }
      // Unknown account, user not found, invalid credentials -> neutral submitted state
      return { ok: true };
    }

    return { ok: true };
  } catch (err) {
    const errorKey = mapAuthError(err);
    if (
      errorKey === 'rate_limit' ||
      errorKey === 'network_error' ||
      errorKey === 'service_unavailable'
    ) {
      return { ok: false, errorKey };
    }
    return { ok: true };
  }
}