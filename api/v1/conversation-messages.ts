import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleConversationMessages } from '../_lib/handlers/conversationMessages.js';
import { bearerToken, clientIp, deviceIdOf, send } from '../_lib/http.js';
import { createRateStore } from '../_lib/rateStore.js';
import { createSupabaseRateClient, serviceClient } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return send(res, { status: 405, body: { error: 'method not allowed' } });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return send(res, { status: 503, body: { error: 'server not configured' } });

  const supabase = serviceClient({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key });
  const limiter = createRateStore(createSupabaseRateClient(supabase));

  const result = await handleConversationMessages(
    {
      limiter,
      async verifyToken(token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) return null;
        return data.user.id;
      },
      async ownerOfConversation(id) {
        const { data, error } = await supabase
          .from('conversation').select('user_id').eq('id', id).maybeSingle();
        if (error) throw new Error(error.message);
        return data?.user_id ?? null;
      },
      async ownerOfMessage(id) {
        const { data, error } = await supabase
          .from('conversation_message').select('user_id').eq('id', id).maybeSingle();
        if (error) throw new Error(error.message);
        return data?.user_id ?? null;
      },
      async insertMessage(row) {
        // ignoreDuplicates: false, so a replayed row overwrites its stored
        // twin. That replay is how a reworded assistant reply reaches the
        // user's other devices; ignoring it stranded the curated wording
        // there forever. The handler has already established that any row
        // under this id belongs to the caller.
        const { error } = await supabase.from('conversation_message').upsert(row, { onConflict: 'id', ignoreDuplicates: false });
        if (error) throw new Error(error.message);
      },
    },
    req.body,
    { deviceId: deviceIdOf(req.headers), ip: clientIp(req.headers), accessToken: bearerToken(req.headers) },
  );

  send(res, result);
}
