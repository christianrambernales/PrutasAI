import { Linking, Platform } from 'react-native';
import {
  handleRecoveryUrl,
  setupRecoveryListener,
  isRecoveryUrl,
  getRecoveryRedirectUrl,
  requestPasswordReset,
} from '../recovery';

let mockClient: any;

jest.mock('../supabase', () => ({
  supabaseClient: () => mockClient,
  resetSupabaseClient: () => {},
}));

describe('recovery module', () => {
  let initialUrl: string | null = null;
  let urlListeners: ((event: { url: string }) => void)[] = [];
  let removeListenerMock: jest.Mock;

  beforeEach(() => {
    initialUrl = null;
    urlListeners = [];
    removeListenerMock = jest.fn();

    jest.spyOn(Linking, 'getInitialURL').mockImplementation(async () => initialUrl);
    jest.spyOn(Linking, 'addEventListener').mockImplementation((event: string, handler: any) => {
      if (event === 'url') {
        urlListeners.push(handler);
      }
      return { remove: removeListenerMock } as any;
    });

    mockClient = {
      auth: {
        setSession: jest.fn(async () => ({ data: { session: { user: { id: 'u1' } } }, error: null })),
        exchangeCodeForSession: jest.fn(async () => ({ data: { session: { user: { id: 'u1' } } }, error: null })),
        resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null })),
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isRecoveryUrl', () => {
    test('identifies valid Android custom scheme recovery URLs', () => {
      expect(isRecoveryUrl('prutasai://reset-password#access_token=tok1&refresh_token=ref1&type=recovery')).toBe(true);
      expect(isRecoveryUrl('prutasai://reset-password?code=code123&type=recovery')).toBe(true);
      expect(isRecoveryUrl('prutasai://reset-password?code=code123')).toBe(true);
    });

    test('identifies valid web recovery URLs', () => {
      expect(isRecoveryUrl('https://prutasai.app/reset-password#access_token=tok1&refresh_token=ref1&type=recovery')).toBe(true);
      expect(isRecoveryUrl('http://localhost:8081/reset-password?code=code123&type=recovery')).toBe(true);
    });

    test('rejects non-recovery types', () => {
      expect(isRecoveryUrl('prutasai://reset-password#access_token=tok1&refresh_token=ref1&type=signup')).toBe(false);
      expect(isRecoveryUrl('prutasai://reset-password?code=123&type=invite')).toBe(false);
    });

    test('rejects non-reset routes', () => {
      expect(isRecoveryUrl('prutasai://account#access_token=tok1&refresh_token=ref1&type=recovery')).toBe(false);
      expect(isRecoveryUrl('https://prutasai.app/settings#access_token=tok1&refresh_token=ref1&type=recovery')).toBe(false);
    });

    test('rejects malformed or incomplete URLs', () => {
      expect(isRecoveryUrl('')).toBe(false);
      expect(isRecoveryUrl('not-a-url')).toBe(false);
      expect(isRecoveryUrl('prutasai://')).toBe(false);
      expect(isRecoveryUrl('prutasai://reset-password')).toBe(false);
      expect(isRecoveryUrl('prutasai://reset-password#invalid_fragment')).toBe(false);
      expect(isRecoveryUrl('prutasai://reset-password?error=access_denied&error_code=otp_expired')).toBe(false);
    });
  });

  describe('setupRecoveryListener & handleRecoveryUrl', () => {
    test('cold link: processes initial URL and invokes onRecoveryReady with no tokens', async () => {
      initialUrl = 'prutasai://reset-password#access_token=secret_tok&refresh_token=secret_ref&type=recovery';
      const onRecoveryReady = jest.fn();

      setupRecoveryListener(onRecoveryReady);

      // Allow microtasks for getInitialURL to resolve
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockClient.auth.setSession).toHaveBeenCalledWith({
        access_token: 'secret_tok',
        refresh_token: 'secret_ref',
      });
      expect(onRecoveryReady).toHaveBeenCalledTimes(1);
      // Redaction verification: callback must not receive token arguments
      expect(onRecoveryReady).toHaveBeenCalledWith();
    });

    test('warm link: processes event URL and invokes onRecoveryReady with no tokens', async () => {
      const onRecoveryReady = jest.fn();
      setupRecoveryListener(onRecoveryReady);

      expect(urlListeners.length).toBe(1);

      // Simulate incoming deep link event
      await urlListeners[0]({
        url: 'prutasai://reset-password#access_token=warm_tok&refresh_token=warm_ref&type=recovery',
      });

      expect(mockClient.auth.setSession).toHaveBeenCalledWith({
        access_token: 'warm_tok',
        refresh_token: 'warm_ref',
      });
      expect(onRecoveryReady).toHaveBeenCalledTimes(1);
      expect(onRecoveryReady).toHaveBeenCalledWith();
    });

    test('PKCE code link: exchanges code for session and notifies navigation', async () => {
      const onRecoveryReady = jest.fn();
      const outcome = await handleRecoveryUrl(
        'prutasai://reset-password?code=pkce_secret_code&type=recovery',
        onRecoveryReady
      );

      expect(outcome.ok).toBe(true);
      expect(mockClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('pkce_secret_code');
      expect(onRecoveryReady).toHaveBeenCalledTimes(1);
      expect(onRecoveryReady).toHaveBeenCalledWith();
    });

    test('web callback link: sets session and notifies navigation', async () => {
      const onRecoveryReady = jest.fn();
      const outcome = await handleRecoveryUrl(
        'https://prutasai.app/reset-password#access_token=web_tok&refresh_token=web_ref&type=recovery',
        onRecoveryReady
      );

      expect(outcome.ok).toBe(true);
      expect(mockClient.auth.setSession).toHaveBeenCalledWith({
        access_token: 'web_tok',
        refresh_token: 'web_ref',
      });
      expect(onRecoveryReady).toHaveBeenCalledTimes(1);
    });

    test('provider failure does not report success or notify navigation', async () => {
      mockClient.auth.setSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Token expired' },
      });

      const onRecoveryReady = jest.fn();
      const outcome = await handleRecoveryUrl(
        'prutasai://reset-password#access_token=bad_tok&refresh_token=bad_ref&type=recovery',
        onRecoveryReady
      );

      expect(outcome.ok).toBe(false);
      expect(onRecoveryReady).not.toHaveBeenCalled();
    });

    test('malformed or non-recovery link does not invoke Supabase or notify navigation', async () => {
      const onRecoveryReady = jest.fn();
      const outcome = await handleRecoveryUrl(
        'prutasai://reset-password#access_token=tok&type=signup',
        onRecoveryReady
      );

      expect(outcome.ok).toBe(false);
      expect(mockClient.auth.setSession).not.toHaveBeenCalled();
      expect(onRecoveryReady).not.toHaveBeenCalled();
    });

    test('listener cleanup removes subscription', () => {
      const unsubscribe = setupRecoveryListener(() => {});
      unsubscribe();
      expect(removeListenerMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRecoveryRedirectUrl', () => {
    test('returns custom scheme on Android / native', () => {
      Platform.OS = 'android';
      expect(getRecoveryRedirectUrl()).toBe('prutasai://reset-password');
    });

    test('returns web url on web platform', () => {
      Platform.OS = 'web';
      expect(getRecoveryRedirectUrl()).toContain('/reset-password');
      Platform.OS = 'android'; // reset
    });
  });

  describe('requestPasswordReset', () => {
    test('returns ok: true for existing account (neutral response)', async () => {
      mockClient.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const result = await requestPasswordReset('farmer@example.com');
      expect(result).toEqual({ ok: true });
      expect(mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'farmer@example.com',
        expect.objectContaining({ redirectTo: expect.stringContaining('reset-password') })
      );
    });

    test('returns ok: true for unknown account (neutral disclosure D-02)', async () => {
      mockClient.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found', status: 400 },
      });

      const result = await requestPasswordReset('unknown@example.com');
      expect(result).toEqual({ ok: true });
    });

    test('returns safe typed error for rate limit (429)', async () => {
      mockClient.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: { message: 'For security purposes, you can only request this once every 60 seconds', status: 429 },
      });

      const result = await requestPasswordReset('farmer@example.com');
      expect(result).toEqual({ ok: false, errorKey: 'rate_limit' });
    });

    test('returns safe typed error for network failure', async () => {
      mockClient.auth.resetPasswordForEmail.mockRejectedValueOnce(
        new Error('Network request failed')
      );

      const result = await requestPasswordReset('farmer@example.com');
      expect(result).toEqual({ ok: false, errorKey: 'network_error' });
    });

    test('returns safe typed error for service outage (500)', async () => {
      mockClient.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: { message: 'Internal Server Error', status: 500 },
      });

      const result = await requestPasswordReset('farmer@example.com');
      expect(result).toEqual({ ok: false, errorKey: 'service_unavailable' });
    });

    test('returns service_unavailable when client is unconfigured', async () => {
      mockClient = null;
      const result = await requestPasswordReset('farmer@example.com');
      expect(result).toEqual({ ok: false, errorKey: 'service_unavailable' });
    });
  });
});