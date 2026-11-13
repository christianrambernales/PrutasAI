import {
  currentAccessToken,
  currentUser,
  resetPassword,
  updateUserPassword,
  signIn,
  signOut,
  signUp,
  resendConfirmation,
  restoreSession,
} from '../session';

let mockClient: unknown;

jest.mock('../supabase', () => ({
  supabaseClient: () => mockClient,
  resetSupabaseClient: () => {},
}));

function client(auth: Record<string, unknown>) {
  return { auth };
}

describe('signIn', () => {
  test('a successful sign-in returns authenticated status, user id and access token', async () => {
    mockClient = client({
      signInWithPassword: async () => ({
        data: { user: { id: 'u1' }, session: { access_token: 'tok' } },
        error: null,
      }),
    });

    expect(await signIn('a@b.test', 'secret')).toEqual({
      status: 'authenticated',
      ok: true,
      userId: 'u1',
      accessToken: 'tok',
    });
  });

  test('a failed sign-in maps to a safe error key without leaking provider text', async () => {
    mockClient = client({
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      }),
    });

    const result = await signIn('a@b.test', 'wrong');
    expect(result).toEqual({ status: 'error', ok: false, errorKey: 'invalid_credentials' });
  });

  test('an unconfigured build reports service_unavailable rather than throwing', async () => {
    mockClient = null;
    expect(await signIn('a@b.test', 'secret')).toEqual({
      status: 'error',
      ok: false,
      errorKey: 'service_unavailable',
    });
  });
});

describe('signUp', () => {
  test('sign-up that needs email confirmation returns confirmation_pending without tokens', async () => {
    mockClient = client({
      signUp: async () => ({
        data: { user: { id: 'u1', email: 'a@b.test' }, session: null },
        error: null,
      }),
    });

    const outcome = await signUp('a@b.test', 'secret');
    expect(outcome).toEqual({
      status: 'confirmation_pending',
      ok: false,
      email: 'a@b.test',
    });
    expect((outcome as any).accessToken).toBeUndefined();
  });

  test('sign-up with immediate session returns authenticated status', async () => {
    mockClient = client({
      signUp: async () => ({
        data: { user: { id: 'u1', email: 'a@b.test' }, session: { access_token: 'tok' } },
        error: null,
      }),
    });

    expect(await signUp('a@b.test', 'secret')).toEqual({
      status: 'authenticated',
      ok: true,
      userId: 'u1',
      accessToken: 'tok',
    });
  });

  test('sign-up failure returns a safe error key', async () => {
    mockClient = client({
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: 'Password should be at least 6 characters', status: 422 },
      }),
    });

    expect(await signUp('a@b.test', '123')).toEqual({
      status: 'error',
      ok: false,
      errorKey: 'weak_password',
    });
  });
});

describe('resendConfirmation', () => {
  test('resendConfirmation invokes Supabase resend with signup type and safe outcome', async () => {
    let capturedArgs: unknown;
    mockClient = client({
      resend: async (args: unknown) => {
        capturedArgs = args;
        return { data: {}, error: null };
      },
    });

    const result = await resendConfirmation('grower@example.com');
    expect(result).toEqual({ ok: true });
    expect(capturedArgs).toEqual({ type: 'signup', email: 'grower@example.com' });
  });

  test('resendConfirmation maps rate limit error safely without account existence leak', async () => {
    mockClient = client({
      resend: async () => ({
        data: null,
        error: { message: 'For security purposes, you can only request this once every 60 seconds', status: 429 },
      }),
    });

    const result = await resendConfirmation('grower@example.com');
    expect(result).toEqual({ ok: false, errorKey: 'rate_limit' });
  });

  test('resendConfirmation returns service_unavailable when unconfigured', async () => {
    mockClient = null;
    expect(await resendConfirmation('grower@example.com')).toEqual({
      ok: false,
      errorKey: 'service_unavailable',
    });
  });
});

describe('restoreSession', () => {
  test('returns no_session when unconfigured or stored session is missing', async () => {
    mockClient = null;
    expect(await restoreSession()).toEqual({ status: 'no_session' });

    mockClient = client({
      getSession: async () => ({ data: { session: null }, error: null }),
    });
    expect(await restoreSession()).toEqual({ status: 'no_session' });
  });

  test('returns valid with user id and access token for an active session', async () => {
    mockClient = client({
      getSession: async () => ({
        data: { session: { access_token: 'tok-123', user: { id: 'u1', email: 'grower@example.com' } } },
        error: null,
      }),
      getUser: async () => ({
        data: { user: { id: 'u1', email: 'grower@example.com' } },
        error: null,
      }),
    });

    expect(await restoreSession()).toEqual({
      status: 'valid',
      userId: 'u1',
      email: 'grower@example.com',
      accessToken: 'tok-123',
    });
  });

  test('returns expired when stored session refresh is invalid/revoked', async () => {
    mockClient = client({
      getSession: async () => ({
        data: { session: { access_token: 'expired-tok', user: { id: 'u1' } } },
        error: null,
      }),
      getUser: async () => ({
        data: { user: null },
        error: { message: 'Invalid Refresh Token', status: 401 },
      }),
    });

    expect(await restoreSession()).toEqual({ status: 'expired' });
  });

  test('returns provider_outage when network or service fails during verification', async () => {
    mockClient = client({
      getSession: async () => ({
        data: { session: null },
        error: { message: 'Service Unavailable', status: 503 },
      }),
    });

    expect(await restoreSession()).toEqual({ status: 'provider_outage' });
  });
});

describe('signOut', () => {
  test('signOut calls client signOut and returns ok: true', async () => {
    let signedOut = false;
    mockClient = client({
      signOut: async () => {
        signedOut = true;
        return { error: null };
      },
    });

    const result = await signOut();
    expect(signedOut).toBe(true);
    expect(result).toEqual({ ok: true });
  });

  test('signOut returns safe error if provider fails', async () => {
    mockClient = client({
      signOut: async () => ({
        error: { message: 'Gateway Timeout', status: 504 },
      }),
    });

    const result = await signOut();
    expect(result).toEqual({ ok: false, errorKey: 'service_unavailable' });
  });

  test('signOut returns service_unavailable when unconfigured', async () => {
    mockClient = null;
    expect(await signOut()).toEqual({ ok: false, errorKey: 'service_unavailable' });
  });
});

describe('currentUser and currentAccessToken', () => {
  test('currentUser returns user details when present', async () => {
    mockClient = client({
      getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.test' } } }),
    });
    expect(await currentUser()).toEqual({ id: 'u1', email: 'a@b.test' });
  });

  test('currentAccessToken returns stored token', async () => {
    mockClient = client({
      getSession: async () => ({ data: { session: { access_token: 'tok' } } }),
    });
    expect(await currentAccessToken()).toBe('tok');
  });

  test('unconfigured returns null/empty', async () => {
    mockClient = null;
    expect(await currentUser()).toBeNull();
    expect(await currentAccessToken()).toBe('');
  });
});

describe('resetPassword', () => {
  test('reports success without revealing account existence', async () => {
    mockClient = client({
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
    });
    expect(await resetPassword('a@b.test')).toEqual({ ok: true });
  });

  test('reports not ok on failure', async () => {
    mockClient = client({
      resetPasswordForEmail: async () => ({ data: null, error: { message: 'boom' } }),
    });
    expect(await resetPassword('a@b.test')).toEqual({ ok: false });
  });
});

describe('updateUserPassword', () => {
  test('updates password successfully and returns ok: true', async () => {
    let capturedArgs: any;
    mockClient = client({
      updateUser: async (args: any) => {
        capturedArgs = args;
        return { data: { user: { id: 'u1' } }, error: null };
      },
    });

    const result = await updateUserPassword('new-secure-password');
    expect(result).toEqual({ ok: true });
    expect(capturedArgs).toEqual({ password: 'new-secure-password' });
  });

  test('maps weak password failure safely', async () => {
    mockClient = client({
      updateUser: async () => ({
        data: { user: null },
        error: { message: 'Password should be at least 6 characters', status: 422 },
      }),
    });

    const result = await updateUserPassword('123');
    expect(result).toEqual({ ok: false, errorKey: 'weak_password' });
  });

  test('returns service_unavailable when unconfigured', async () => {
    mockClient = null;
    expect(await updateUserPassword('new-secure-password')).toEqual({
      ok: false,
      errorKey: 'service_unavailable',
    });
  });
});
