/**
 * The service-role client. It bypasses RLS entirely, which is why this key is
 * a Vercel environment variable and never an EXPO_PUBLIC_ value.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RateClient } from './rateStore.js';

export interface ServiceEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export function serviceClient(env: ServiceEnv): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseRateClient(supabase: SupabaseClient): RateClient {
  return {
    async prune(key, before) {
      const { error } = await supabase.from('rate_hit').delete().eq('key', key).lt('at', before);
      if (error) throw new Error(error.message);
    },
    async hit(key, at) {
      const { error } = await supabase.from('rate_hit').insert({ key, at });
      if (error) throw new Error(error.message);
    },
    async count(key, since) {
      const { count, error } = await supabase
        .from('rate_hit')
        .select('key', { count: 'exact', head: true })
        .eq('key', key)
        .gte('at', since);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  };
}
