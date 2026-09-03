/**
 * Restore for conversations, mirroring restore.ts. A direct read of the
 * user's own rows, authorized by RLS — no API endpoint needed for reads.
 */

import type { SqlDriver } from '../db/driver';
import { insertConversation, insertMessage } from '../db/repositories/conversations';
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
}

export interface RestoreConversationsOptions {
  db: SqlDriver;
  fetchRemote?: () => Promise<{ conversations: RemoteConversation[]; messages: RemoteMessage[] }>;
  now?: () => Date;
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
    .select('id, conversation_id, role, kind, text, verdict_json, created_at')
    .order('created_at', { ascending: true });
  if (msg.error) throw new Error(msg.error.message);

  return { conversations: (conv.data ?? []) as RemoteConversation[], messages: (msg.data ?? []) as RemoteMessage[] };
}

export async function restoreConversations(options: RestoreConversationsOptions): Promise<RestoreReport> {
  const { db, fetchRemote = defaultFetchRemote, now = () => new Date() } = options;
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
    // deleted_at rides along: a conversation trashed on another device must
    // arrive here trashed, with its original 15-day clock, not as an active
    // one whose retention starts over.
    insertConversation(db, {
      uuid: c.id, title: c.title, deviceId: 'restored',
      createdAt: c.created_at, updatedAt: c.updated_at, deletedAt: c.deleted_at, syncedAt,
    });
    report.restored += 1;
  }
  for (const m of remote.messages) {
    insertMessage(db, {
      uuid: m.id, conversationId: m.conversation_id, role: m.role, kind: m.kind,
      text: m.text, verdictJson: m.verdict_json === null ? null : JSON.stringify(m.verdict_json),
      createdAt: m.created_at, syncedAt,
    });
  }

  return report;
}
