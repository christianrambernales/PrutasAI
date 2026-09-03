/**
 * Push-only sync for conversations, mirroring drain.ts exactly. Conversations
 * drain before messages so a message's parent row exists remotely first —
 * the remote foreign key would otherwise reject it.
 */

import type { SqlDriver } from '../db/driver';
import {
  markConversationSynced, markMessageSynced, pendingConversations, pendingMessages,
} from '../db/repositories/conversations';

export interface DrainConversationsOptions {
  db: SqlDriver;
  baseUrl: string;
  deviceId: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
  limit?: number;
  now?: () => Date;
}

export interface DrainReport {
  attempted: number;
  synced: number;
  failed: number;
  sessionExpired: boolean;
}

export async function drainConversations(options: DrainConversationsOptions): Promise<DrainReport> {
  const { db, baseUrl, deviceId, accessToken, fetchImpl = fetch, limit = 50, now = () => new Date() } = options;

  const report: DrainReport = { attempted: 0, synced: 0, failed: 0, sessionExpired: false };
  if (baseUrl.trim() === '' || accessToken.trim() === '') return report;

  const headers = { 'Content-Type': 'application/json', 'X-Device-Id': deviceId, Authorization: `Bearer ${accessToken}` };

  for (const conv of pendingConversations(db, limit)) {
    report.attempted += 1;
    let status: number;
    try {
      const response = await fetchImpl(`${baseUrl.trim()}/v1/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          uuid: conv.uuid, title: conv.title, created_at: conv.createdAt,
          updated_at: conv.updatedAt, deleted_at: conv.deletedAt,
        }),
      });
      status = response.status;
    } catch {
      report.failed += 1;
      return report;
    }

    if (status === 401) { report.failed += 1; report.sessionExpired = true; return report; }
    if (status === 429) return report;
    if (status < 300 || (status >= 400 && status < 500)) {
      markConversationSynced(db, conv.uuid, now().toISOString());
      report.synced += 1;
      continue;
    }
    report.failed += 1;
  }

  for (const msg of pendingMessages(db, limit)) {
    report.attempted += 1;
    let status: number;
    try {
      const response = await fetchImpl(`${baseUrl.trim()}/v1/conversation-messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          uuid: msg.uuid, conversation_id: msg.conversationId, role: msg.role,
          kind: msg.kind, text: msg.text, verdict_json: msg.verdictJson, created_at: msg.createdAt,
        }),
      });
      status = response.status;
    } catch {
      report.failed += 1;
      return report;
    }

    if (status === 401) { report.failed += 1; report.sessionExpired = true; return report; }
    if (status === 429) return report;
    if (status < 300 || (status >= 400 && status < 500)) {
      markMessageSynced(db, msg.uuid, now().toISOString());
      report.synced += 1;
      continue;
    }
    report.failed += 1;
  }

  return report;
}
