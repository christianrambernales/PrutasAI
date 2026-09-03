/**
 * The Supabase client the app uses.
 *
 * It carries the anon key, which is public by design: it identifies the
 * project and every permission is enforced server-side by RLS. The service
 * role key, which bypasses RLS, never comes near this file.
 *
 * Session storage differs by platform, and the weaker case is stated rather
 * than hidden: on native the token sits in expo-secure-store, but **on web
 * there is no secure storage** and it falls back to localStorage, readable by
 * any script on the origin. That is acceptable here because the rows behind it
 * are anonymous agronomy records, not because it is safe in general.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

let client: SupabaseClient | null | undefined;

export function supabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (url.trim() === '' || key.trim() === '') {
    client = null;
    return client;
  }

  client = createClient(url, key, {
    auth: {
      storage: Platform.OS === 'web' ? undefined : secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      // There is no deep-link handler, so a URL fragment is never a session.
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** Tests only: forget the memoised client so env changes take effect. */
export function resetSupabaseClient(): void {
  client = undefined;
}
