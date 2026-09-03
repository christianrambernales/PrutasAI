import { currentAccessToken, currentUser, resetPassword, signIn, signOut, signUp } from '../session';

let mockClient: unknown;

jest.mock('../supabase', () => ({
  supabaseClient: () => mockClient,
  resetSupabaseClient: () => {},
}));

function client(auth: Record<string, unknown>) {
  return { auth };
}

test('a successful sign-in returns the user id and access token', async () => {
  mockClient = client({
    signInWithPassword: async (_credentials: { email: string; password: string }) => ({
      data: { user: { id: 'u1' }, session: { access_token: 'tok' } },
      error: null,
    }),
  });

  expect(await signIn('a@b.test', 'secret')).toEqual({ ok: true, userId: 'u1', accessToken: 'tok' });
});

test('a failed sign-in reports the reason', async () => {
  mockClient = client({
    signInWithPassword: async (_credentials: { email: string; password: string }) => ({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    }),
  });

  expect(await signIn('a@b.test', 'wrong')).toEqual({ ok: false, error: 'Invalid login credentials' });
});

test('sign-up that needs email confirmation is not reported as signed in', async () => {
  // Supabase returns a user with no session when confirmation is required.
  // Treating that as success would show a signed-in UI with no token behind it.
  mockClient = client({
    signUp: async (_credentials: { email: string; password: string }) => ({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    }),
  });

  expect((await signUp('a@b.test', 'secret')).ok).toBe(false);
});

test('an unconfigured build reports it rather than throwing', async () => {
  mockClient = null;
  expect(await signIn('a@b.test', 'secret')).toEqual({ ok: false, error: 'not configured' });
  expect(await currentUser()).toBeNull();
  await expect(signOut()).resolves.toBeUndefined();
});

test('an unconfigured build has no access token', async () => {
  mockClient = null;
  expect(await currentAccessToken()).toBe('');
});

test('a stored session returns its access token', async () => {
  mockClient = client({
    getSession: async () => ({ data: { session: { access_token: 'tok' } } }),
  });

  expect(await currentAccessToken()).toBe('tok');
});

test('a password reset request reports success without revealing whether the account exists', async () => {
  mockClient = client({
    resetPasswordForEmail: async (_email: string) => ({ data: {}, error: null }),
  });

  expect(await resetPassword('a@b.test')).toEqual({ ok: true });
});

test('a password reset request that fails reports it', async () => {
  mockClient = client({
    resetPasswordForEmail: async (_email: string) => ({ data: null, error: { message: 'boom' } }),
  });

  expect(await resetPassword('a@b.test')).toEqual({ ok: false });
});

test('an unconfigured build reports the reset request as not ok', async () => {
  mockClient = null;
  expect(await resetPassword('a@b.test')).toEqual({ ok: false });
});
