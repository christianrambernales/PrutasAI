/**
 * Hard-deletes conversations past the Trash retention period. Runs from
 * whichever device happens to check first; every other device's own sweep or
 * next restore simply finds the row already gone (spec §5).
 */

import type { SqlDriver } from '../db/driver';
import { conversationsPastRetention, hardDeleteConversation } from '../db/repositories/conversations';
import { supabaseClient } from '../auth/supabase';

export const RETENTION_DAYS = 15;

export interface PurgeTrashOptions {
  db: SqlDriver;
  now?: () => Date;
  /** Deletes the remote row for a permanently-purged conversation, if it was ever synced. */
  deleteRemote?: (uuid: string) => Promise<void>;
}

/**
 * Deletes a conversation's remote row (its messages go with it, by the
 * schema's ON DELETE CASCADE).
 *
 * Exported because permanent deletion has two entry points — this sweep and
 * the Trash screen's "Delete permanently" — and a local-only delete on either
 * one just means the conversation comes back on the next restore.
 */
export async function deleteConversationRemote(uuid: string): Promise<void> {
  const supabase = supabaseClient();
  // No client at all means this install has no account, so there is no remote
  // row to delete and nothing has failed.
  if (!supabase) return;
  const { error } = await supabase.from('conversation').delete().eq('id', uuid);
  // supabase-js reports a failed delete in `error` rather than by rejecting,
  // so without this the caller cannot tell a successful delete from one the
  // server refused.
  if (error) throw new Error(error.message);
}

/**
 * Permanent deletion, both halves at once — remote first, and the local rows
 * only once the remote row is actually gone.
 *
 * The order is the whole point. A failure here is meant to be retried by a
 * later sweep, on this or another synced device, but the retry can only find
 * the conversation again while the local row still exists:
 * `conversationsPastRetention` reads the local table, so deleting locally
 * first erases the only record that the remote row is owed a delete. The
 * server would keep it forever and hand the conversation back on the next
 * sign-in restore — the exact outcome the remote delete exists to prevent.
 *
 * Returns whether the conversation is now gone from both places, so a caller
 * can tell a completed deletion from one still waiting on the network. An
 * install with no account has no remote row and always succeeds.
 */
export async function deleteConversationEverywhere(
  db: SqlDriver,
  uuid: string,
  deleteRemote: (uuid: string) => Promise<void> = deleteConversationRemote,
): Promise<boolean> {
  try {
    await deleteRemote(uuid);
  } catch {
    // Left in the Trash on purpose: still trashed, still past retention, so
    // the next sweep picks it up again.
    return false;
  }
  hardDeleteConversation(db, uuid);
  return true;
}

export async function purgeTrash(options: PurgeTrashOptions): Promise<{ purged: number }> {
  const { db, now = () => new Date(), deleteRemote = deleteConversationRemote } = options;
  const cutoff = new Date(now().getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const due = conversationsPastRetention(db, cutoff);
  let purged = 0;
  for (const uuid of due) {
    // Counts what was actually deleted, not what was due: a conversation whose
    // remote delete failed is still in the Trash when this returns.
    if (await deleteConversationEverywhere(db, uuid, deleteRemote)) purged += 1;
  }

  return { purged };
}
