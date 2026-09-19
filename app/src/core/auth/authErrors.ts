import type { strings } from '../../ui/i18n/strings';

type Strings = ReturnType<typeof strings>;

export type AuthErrorKey =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'weak_password'
  | 'rate_limit'
  | 'network_error'
  | 'service_unavailable'
  | 'unknown';

/**
 * Maps Supabase Auth errors and network failures into safe, typed bilingual error keys.
 * Raw provider text, technical errors, and account-existence clues are strictly input-only
 * and are NEVER returned or leaked to caller or user.
 */
export function mapAuthError(err: unknown): AuthErrorKey {
  if (!err) return 'unknown';

  let message = '';
  let status: number | undefined;
  let code = '';

  if (typeof err === 'string') {
    message = err;
  } else if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;
    if (typeof record.message === 'string') message = record.message;
    if (typeof record.status === 'number') status = record.status;
    else if (typeof record.status === 'string') status = parseInt(record.status, 10);
    if (typeof record.code === 'string') code = record.code;
  }

  const msgLower = message.toLowerCase();
  const codeLower = code.toLowerCase();

  // 1. Service outages / unconfigured (5xx)
  if (
    (status !== undefined && status >= 500 && status <= 599) ||
    msgLower.includes('service unavailable') ||
    msgLower.includes('bad gateway') ||
    msgLower.includes('gateway timeout') ||
    msgLower.includes('internal server error') ||
    msgLower.includes('not configured')
  ) {
    return 'service_unavailable';
  }

  // 2. Rate limiting (429)
  if (
    status === 429 ||
    codeLower.includes('rate_limit') ||
    codeLower === 'over_email_send_rate_limit' ||
    codeLower === 'over_request_rate_limit' ||
    msgLower.includes('rate limit') ||
    msgLower.includes('too many requests') ||
    msgLower.includes('once every') ||
    msgLower.includes('over_email_send_rate_limit')
  ) {
    return 'rate_limit';
  }

  // 3. Network error / Offline
  if (
    status === 0 ||
    codeLower.includes('network') ||
    msgLower.includes('failed to fetch') ||
    msgLower.includes('network request failed') ||
    msgLower.includes('network error') ||
    msgLower.includes('networkerror') ||
    msgLower.includes('fetch failed') ||
    msgLower.includes('timed out') ||
    msgLower.includes('timeout') ||
    msgLower.includes('abort') ||
    msgLower.includes('econnrefused') ||
    msgLower.includes('internet')
  ) {
    return 'network_error';
  }

  // 4. Email not confirmed
  if (
    codeLower === 'email_not_confirmed' ||
    msgLower.includes('email not confirmed') ||
    msgLower.includes('confirm your email') ||
    msgLower.includes('email not verified') ||
    msgLower.includes('not confirmed')
  ) {
    return 'email_not_confirmed';
  }

  // 5. Weak password
  if (
    codeLower === 'weak_password' ||
    msgLower.includes('weak password') ||
    msgLower.includes('password should be at least') ||
    msgLower.includes('password is too short') ||
    msgLower.includes('password must be at least') ||
    msgLower.includes('password should contain')
  ) {
    return 'weak_password';
  }

  // 6. Invalid credentials
  if (
    codeLower === 'invalid_credentials' ||
    codeLower === 'invalid_grant' ||
    msgLower.includes('invalid login credentials') ||
    msgLower.includes('invalid email or password') ||
    msgLower.includes('invalid credentials') ||
    msgLower.includes('user not found') ||
    msgLower.includes('invalid refresh token')
  ) {
    return 'invalid_credentials';
  }

  return 'unknown';
}

/**
 * Resolves a safe typed error key to a user-facing bilingual string from the dictionary.
 */
export function authErrorMessage(key: AuthErrorKey, t: Strings): string {
  switch (key) {
    case 'invalid_credentials':
      return t.authErrorInvalidCredentials;
    case 'email_not_confirmed':
      return t.authErrorEmailNotConfirmed;
    case 'weak_password':
      return t.authErrorWeakPassword;
    case 'rate_limit':
      return t.authErrorRateLimit;
    case 'network_error':
      return t.authErrorNetwork;
    case 'service_unavailable':
      return t.authErrorServiceUnavailable;
    case 'unknown':
    default:
      return t.authErrorUnknown;
  }
}
