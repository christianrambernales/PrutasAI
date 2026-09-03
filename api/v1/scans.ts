import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleScans } from '../_lib/handlers/scans.js';
import { bearerToken, clientIp, deviceIdOf, send } from '../_lib/http.js';
import { createRateStore } from '../_lib/rateStore.js';
import { createSupabaseRateClient, serviceClient } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return send(res, { status: 405, body: { error: 'method not allowed' } });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Fail closed: writing without a key would look like an outage, not a
  // misconfiguration, and the rows would be lost silently.
  if (!url || !key) return send(res, { status: 503, body: { error: 'server not configured' } });

  const supabase = serviceClient({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key });
  const limiter = createRateStore(createSupabaseRateClient(supabase));

  const result = await handleScans(
    {
      limiter,
      // The service client bypasses RLS, so the token is verified explicitly
      // rather than trusted. getUser() validates the signature and expiry.
      //
      // It is a dependency rather than a call in this file so the handler can
      // decide *when* it runs — behind its own rate-limit gate — and so the
      // ordering is unit-tested rather than only reviewed.
      async verifyToken(token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) return null;
        return data.user.id;
      },
      async insertScan(row) {
        // Replaying the queue must not duplicate a scan.
        const { error } = await supabase.from('scan').upsert(row, {
          onConflict: 'id',
          // false, not true: a re-upload after signing in as a different
          // account must rewrite user_id. With duplicates ignored the row
          // would silently keep its previous owner.
          ignoreDuplicates: false,
        });
        if (error) throw new Error(error.message);
      },
    },
    req.body,
    {
      deviceId: deviceIdOf(req.headers),
      ip: clientIp(req.headers),
      accessToken: bearerToken(req.headers),
    },
  );

  send(res, result);
}
