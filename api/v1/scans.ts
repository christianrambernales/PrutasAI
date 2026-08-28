import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleScans } from '../_lib/handlers/scans';
import { clientIp, deviceIdOf, send } from '../_lib/http';
import { createRateStore } from '../_lib/rateStore';
import { createSupabaseRateClient, serviceClient } from '../_lib/supabase';

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
      async insertScan(row) {
        // Replaying the queue must not duplicate a scan.
        const { error } = await supabase.from('scan').upsert(row, {
          onConflict: 'id',
          ignoreDuplicates: true,
        });
        if (error) throw new Error(error.message);
      },
    },
    req.body,
    { deviceId: deviceIdOf(req.headers), ip: clientIp(req.headers) },
  );

  send(res, result);
}
