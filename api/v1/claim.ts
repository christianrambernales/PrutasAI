import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleClaim } from '../_lib/handlers/claim.js';
import { bearerToken, clientIp, deviceIdOf, send } from '../_lib/http.js';
import { createRateStore } from '../_lib/rateStore.js';
import { createSupabaseRateClient, serviceClient } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return send(res, { status: 405, body: { error: 'method not allowed' } });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return send(res, { status: 503, body: { error: 'server not configured' } });

  const supabase = serviceClient({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key });

  const result = await handleClaim(
    {
      limiter: createRateStore(createSupabaseRateClient(supabase)),
      async verifyToken(token: string) {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) return null;
        return data.user.id;
      },
      async claim(userId: string, deviceId: string) {
        const { data, error } = await supabase
          .from('scan')
          .update({ user_id: userId })
          .eq('device_id', deviceId)
          .is('user_id', null)
          .select('id');
        if (error) throw new Error(error.message);
        return data?.length ?? 0;
      },
    },
    {
      deviceId: deviceIdOf(req.headers),
      accessToken: bearerToken(req.headers),
      ip: clientIp(req.headers),
    },
  );

  send(res, result);
}
