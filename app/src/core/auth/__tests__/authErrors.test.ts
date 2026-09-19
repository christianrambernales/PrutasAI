import { mapAuthError, authErrorMessage, AuthErrorKey } from '../authErrors';
import { strings } from '../../../ui/i18n/strings';

describe('mapAuthError', () => {
  test('maps invalid login credentials to invalid_credentials', () => {
    expect(mapAuthError({ message: 'Invalid login credentials', status: 400 })).toBe('invalid_credentials');
    expect(mapAuthError({ code: 'invalid_credentials' })).toBe('invalid_credentials');
    expect(mapAuthError({ message: 'Invalid email or password' })).toBe('invalid_credentials');
  });

  test('maps unconfirmed email to email_not_confirmed', () => {
    expect(mapAuthError({ message: 'Email not confirmed', status: 400 })).toBe('email_not_confirmed');
    expect(mapAuthError({ code: 'email_not_confirmed' })).toBe('email_not_confirmed');
    expect(mapAuthError({ message: 'Please confirm your email before logging in' })).toBe('email_not_confirmed');
  });

  test('maps weak password to weak_password', () => {
    expect(mapAuthError({ message: 'Password should be at least 6 characters', status: 422 })).toBe('weak_password');
    expect(mapAuthError({ code: 'weak_password' })).toBe('weak_password');
    expect(mapAuthError({ message: 'Password is too short' })).toBe('weak_password');
  });

  test('maps rate limiting to rate_limit', () => {
    expect(mapAuthError({ message: 'For security purposes, you can only request this once every 60 seconds', status: 429 })).toBe('rate_limit');
    expect(mapAuthError({ code: 'over_email_send_rate_limit' })).toBe('rate_limit');
    expect(mapAuthError({ code: 'over_request_rate_limit' })).toBe('rate_limit');
    expect(mapAuthError({ message: 'Too many requests' })).toBe('rate_limit');
  });

  test('maps offline/network errors to network_error', () => {
    expect(mapAuthError(new TypeError('Failed to fetch'))).toBe('network_error');
    expect(mapAuthError(new Error('Network request failed'))).toBe('network_error');
    expect(mapAuthError({ message: 'Network error', status: 0 })).toBe('network_error');
    expect(mapAuthError({ message: 'The request timed out' })).toBe('network_error');
  });

  test('maps service outages to service_unavailable', () => {
    expect(mapAuthError({ message: 'Service Unavailable', status: 503 })).toBe('service_unavailable');
    expect(mapAuthError({ message: 'Bad Gateway', status: 502 })).toBe('service_unavailable');
    expect(mapAuthError({ message: 'Gateway Timeout', status: 504 })).toBe('service_unavailable');
    expect(mapAuthError({ message: 'Internal Server Error', status: 500 })).toBe('service_unavailable');
    expect(mapAuthError('not configured')).toBe('service_unavailable');
  });

  test('maps unknown or account-revealing provider messages to unknown without leaking text', () => {
    const leakedMessage = 'User already registered with id 12345-abcde';
    const result = mapAuthError({ message: leakedMessage });
    expect(result).toBe('unknown');
    expect(result).not.toContain('User already registered');
    expect(result).not.toContain('12345-abcde');
  });

  test('maps null or undefined error to unknown', () => {
    expect(mapAuthError(null)).toBe('unknown');
    expect(mapAuthError(undefined)).toBe('unknown');
    expect(mapAuthError({})).toBe('unknown');
  });
});

describe('authErrorMessage', () => {
  const tEN = strings('EN');
  const tFIL = strings('FIL');

  const keys: AuthErrorKey[] = [
    'invalid_credentials',
    'email_not_confirmed',
    'weak_password',
    'rate_limit',
    'network_error',
    'service_unavailable',
    'unknown',
  ];

  test('provides non-empty strings in both EN and FIL for every safe key', () => {
    for (const key of keys) {
      const msgEN = authErrorMessage(key, tEN);
      const msgFIL = authErrorMessage(key, tFIL);
      expect(msgEN).toBeTruthy();
      expect(msgFIL).toBeTruthy();
      expect(typeof msgEN).toBe('string');
      expect(typeof msgFIL).toBe('string');
      expect(msgEN).not.toBe(msgFIL);
    }
  });
});
