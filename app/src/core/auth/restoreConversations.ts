/**
 * Restore for conversations, mirroring restore.ts. A direct read of the
 * user's own rows, authorized by RLS — no API endpoint needed for reads.
 */

import type { SqlDriver } from '../db/driver';
import { insertConversation, insertMessage, markConversationConflict, markMessageConflict } from '../db/repositories/conversations';
import { supabaseClient } from './supabase';

export interface RemoteConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RemoteMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  kind: string | null;
  text: string;
  verdict_json: unknown;
  created_at: string;
  updated_at?: string | null;
}

export interface RestoreConversationsOptions {
  db: SqlDriver;
  fetchRemote?: () => Promise<{ conversations: RemoteConversation[]; messages: RemoteMessage[] }>;
  now?: () => Date;
  /** Verified session owner. Remote rows never supply ownership. */
  userId?: string;
}

export interface RestoreReport {
  restored: number;
  restoreFailed: boolean;
}

async function defaultFetchRemote(): Promise<{ conversations: RemoteConversation[]; messages: RemoteMessage[] }> {
  const supabase = supabaseClient();
  if (!supabase) return { conversations: [], messages: [] };

  const conv = await supabase.from('conversation')
    .select('id, title, created_at, updated_at, deleted_at')
    .order('updated_at', { ascending: false });
  if (conv.error) throw new Error(conv.error.message);

  const msg = await supabase.from('conversation_message')
    .select('id, conversation_id, role, kind, text, verdict_json, created_at, updated_at')
    .order('created_at', { ascending: true });
  if (msg.error) throw new Error(msg.error.message);

  return { conversations: (conv.data ?? []) as RemoteConversation[], messages: (msg.data ?? []) as RemoteMessage[] };
}

export async function restoreConversations(options: RestoreConversationsOptions): Promise<RestoreReport> {
  const { db, fetchRemote = defaultFetchRemote, now = () => new Date(), userId } = options;
  const report: RestoreReport = { restored: 0, restoreFailed: false };

  let remote: { conversations: RemoteConversation[]; messages: RemoteMessage[] };
  try {
    remote = await fetchRemote();
  } catch {
    report.restoreFailed = true;
    return report;
  }

  const syncedAt = now().toISOString();
  for (const c of remote.conversations) {
    const remoteUpdatedTime = Date.parse(c.updated_at);
    const remoteDeletedTime = c.deleted_at === null ? null : Date.parse(c.deleted_at);
    const local = db.get<{ account_id: string | null; updated_at: string }>(
      'SELECT account_id, updated_at FROM conversation WHERE uuid = ?', [c.id],
    );
    if (!Number.isFinite(remoteUpdatedTime) || (remoteDeletedTime !== null && !Number.isFinite(remoteDeletedTime))) {
      if (local && (!userId || local.account_id === userId)) markConversationConflict(db, c.id, 'invalid_remote_timestamp', userId ? { activeAccountId: userId } : undefined, syncedAt);
      continue;
    }
    if (local) {
      if (userId && local.account_id !== userId) continue;
      const localUpdatedTime = Date.parse(local.updated_at);
      if (!Number.isFinite(localUpdatedTime)) {
        markConversationConflict(db, c.id, 'invalid_local_timestamp', userId ? { activeAccountId: userId } : undefined, syncedAt);
        continue;
      }
      if (remoteUpdatedTime <= localUpdatedTime || (remoteDeletedTime !== null && remoteDeletedTime < localUpdatedTime)) continue;
      db.all(
        `UPDATE conversation SET title = ?, updated_at = ?, deleted_at = ?, synced_at = ?,
            sync_status = 'synced', sync_error_code = NULL, retry_count = 0, next_retry_at = NULL
          WHERE uuid = ? AND account_id ${userId ? '= ?' : 'IS NULL'}`,
        [c.title, c.updated_at, c.deleted_at, syncedAt, c.id, ...(userId ? [userId] : [])],
      );
      report.restored += 1;
      continue;
    }
    // deleted_at rides along: a conversation trashed on another device must
    // arrive here trashed, with its original 15-day clock, not as an active
    // one whose retention starts over.
    insertConversation(db, {
      uuid: c.id, title: c.title, deviceId: 'restored',
      createdAt: c.created_at, updatedAt: c.updated_at, deletedAt: c.deleted_at, syncedAt, accountId: userId ?? null,
    });
    report.restored += 1;
  }
  for (const m of remote.messages) {
    const remoteUpdatedAt = m.updated_at ?? m.created_at;
    if (!Number.isFinite(Date.parse(remoteUpdatedAt))) {
      const local = db.get<{ account_id: string | null }>('SELECT account_id FROM conversation_message WHERE uuid = ?', [m.id]);
      if (local && (!userId || local.account_id === userId)) markMessageConflict(db, m.id, 'invalid_remote_timestamp', userId ? { activeAccountId: userId } : undefined, syncedAt);
      continue;
    }
    const parent = db.get<{ account_id: string | null }>('SELECT account_id FROM conversation WHERE uuid = ?', [m.conversation_id]);
    // A remote child must attach only to the active owner's restored parent.
    if (!parent || (userId && parent.account_id !== userId)) continue;
    const local = db.get<{ account_id: string | null; updated_at: string }>('SELECT account_id, updated_at FROM conversation_message WHERE uuid = ?', [m.id]);
    if (local) {
      if (userId && local.account_id !== userId) continue;
      const localTime = Date.parse(local.updated_at);
      if (!Number.isFinite(localTime)) {
        markMessageConflict(db, m.id, 'invalid_local_timestamp', userId ? { activeAccountId: userId } : undefined, syncedAt);
      } else if (Date.parse(remoteUpdatedAt) > localTime) {
        db.all(
          `UPDATE conversation_message SET role = ?, kind = ?, text = ?, verdict_json = ?, updated_at = ?, synced_at = ?,
              sync_status = 'synced', sync_error_code = NULL, retry_count = 0, next_retry_at = NULL
            WHERE uuid = ? AND account_id ${userId ? '= ?' : 'IS NULL'}`,
          [m.role, m.kind, m.text, m.verdict_json === null ? null : JSON.stringify(m.verdict_json), remoteUpdatedAt, syncedAt, m.id, ...(userId ? [userId] : [])],
        );
      }
      continue;
    }
    insertMessage(db, {
      uuid: m.id, conversationId: m.conversation_id, role: m.role, kind: m.kind,
      text: m.text, verdictJson: m.verdict_json === null ? null : JSON.stringify(m.verdict_json),
      createdAt: m.created_at, updatedAt: remoteUpdatedAt, syncedAt, accountId: userId ?? null,
    });
  }

  return report;
}
