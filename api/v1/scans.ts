import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleScans } from '../_lib/handlers/scans.js';
import { bearerToken, clientIp, deviceIdOf, send } from '../_lib/http.js';
import { createRateStore } from '../_lib/rateStore.js';
import { createSupabaseRateClient, serviceClient } from '../_lib/supabase.js';
import { OwnershipConflictError } from '../_lib/validate.js';

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
      async verifyToken(token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) return null;
        return data.user.id;
      },
      async ownerOfScan(id) {
        const { data, error } = await supabase
          .from('scan')
          .select('user_id')
          .eq('id', id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data?.user_id ?? null;
      },
      async insertScan(row) {
        // Atomic owner-bound persistence via migration 0007 primitive.
        // Cannot transfer ownership during a race or replay across owners.
        const { error } = await supabase.rpc('upsert_scan_atomic', {
          p_id: row.id,
          p_user_id: row.user_id,
          p_device_id: row.device_id,
          p_image_uri: row.image_uri,
          p_fruit_key: row.fruit_key,
          p_fruit_conf: row.fruit_conf,
          p_variety_key: row.variety_key,
          p_variety_conf: row.variety_conf,
          p_bbox_json: row.bbox_json,
          p_manifest_version: row.manifest_version,
          p_created_at: row.created_at,
          p_updated_at: row.updated_at ?? row.created_at,
          p_deleted_at: row.deleted_at ?? null,
          p_lat: row.lat,
          p_lon: row.lon,
        });

        if (error) {
          if (
            error.message?.includes('ownership conflict') ||
            error.code === '23505' ||
            error.code === 'P0001'
          ) {
            throw new OwnershipConflictError('ownership conflict: scan owned by another account');
          }
          throw new Error(error.message);
        }
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