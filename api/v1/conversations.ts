import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleConversations } from '../_lib/handlers/conversations.js';
import { bearerToken, clientIp, deviceIdOf, send } from '../_lib/http.js';
import { createRateStore } from '../_lib/rateStore.js';
import { createSupabaseRateClient, serviceClient } from '../_lib/supabase.js';
import { OwnershipConflictError } from '../_lib/validate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return send(res, { status: 405, body: { error: 'method not allowed' } });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return send(res, { status: 503, body: { error: 'server not configured' } });

  const supabase = serviceClient({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key });
  const limiter = createRateStore(createSupabaseRateClient(supabase));

  const result = await handleConversations(
    {
      limiter,
      async verifyToken(token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) return null;
        return data.user.id;
      },
      async ownerOfConversation(id) {
        // maybeSingle, not single: "no such row" is the first-upload case and
        // must come back as null rather than as an error.
        const { data, error } = await supabase
          .from('conversation').select('user_id').eq('id', id).maybeSingle();
        if (error) throw new Error(error.message);
        return data?.user_id ?? null;
      },
      async upsertConversation(row) {
        const { error } = await supabase.rpc('upsert_conversation_atomic', {
          p_id: row.id,
          p_user_id: row.user_id,
          p_title: row.title,
          p_created_at: row.created_at,
          p_updated_at: row.updated_at,
          p_deleted_at: row.deleted_at,
        });
        if (error) {
          if (
            error.message?.includes('ownership conflict') ||
            error.code === '23505' ||
            error.code === 'P0001'
          ) {
            throw new OwnershipConflictError('ownership conflict: conversation owned by another account');
          }
          throw new Error(error.message);
        }
      },
    },
    req.body,
    { deviceId: deviceIdOf(req.headers), ip: clientIp(req.headers), accessToken: bearerToken(req.headers) },
  );

  send(res, result);
}