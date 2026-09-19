/**
 * Push-only sync for conversations, mirroring drain.ts exactly. Conversations
 * drain before messages so a message's parent row exists remotely first —
 * the remote foreign key would otherwise reject it.
 */

import type { SqlDriver } from '../db/driver';
import {
  markConversationNeedsAttention, markConversationSynced, markMessageNeedsAttention,
  markMessageSynced, pendingConversations, pendingMessages, scheduleConversationRetry, scheduleMessageRetry,
} from '../db/repositories/conversations';
import type { LocalAccountScope } from '../db/repositories/scans';
import { nextRetryAt } from './backoff';

export interface DrainConversationsOptions {
  db: SqlDriver;
  baseUrl: string;
  deviceId: string;
  accessToken: string;
  userId?: string;
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
  const { db, baseUrl, deviceId, accessToken, userId, fetchImpl = fetch, limit = 50, now = () => new Date() } = options;

  const report: DrainReport = { attempted: 0, synced: 0, failed: 0, sessionExpired: false };
  if (baseUrl.trim() === '' || accessToken.trim() === '') return report;

  const headers = { 'Content-Type': 'application/json', 'X-Device-Id': deviceId, Authorization: `Bearer ${accessToken}` };

  const scope: LocalAccountScope | undefined = userId ? { activeAccountId: userId } : undefined;
  const conversations = scope ? pendingConversations(db, limit, scope).filter(conv => conv.accountId === userId) : pendingConversations(db, limit);
  for (const conv of conversations) {
    report.attempted += 1;
    let status: number;
    let retryAfter: string | null = null;
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
      retryAfter = response.headers?.get('Retry-After') ?? null;
    } catch {
      scheduleConversationRetry(db, conv.uuid, nextRetryAt(conv.retryCount ?? 0, now().getTime(), null), 'network_error', scope);
      report.failed += 1;
      continue;
    }

    if (status === 401) { report.failed += 1; report.sessionExpired = true; return report; }
    if (status === 408 || status === 429 || status >= 500) {
      scheduleConversationRetry(db, conv.uuid, nextRetryAt(conv.retryCount ?? 0, now().getTime(), retryAfter), `http_${status}`, scope);
      report.failed += 1;
      if (status === 429) return report;
      continue;
    }
    if (status < 300) {
      markConversationSynced(db, conv.uuid, now().toISOString(), scope);
      report.synced += 1;
      continue;
    }
    if (status >= 400 && status < 500) {
      markConversationNeedsAttention(db, conv.uuid, `http_${status}`, scope);
      report.failed += 1;
      continue;
    }
    scheduleConversationRetry(db, conv.uuid, nextRetryAt(conv.retryCount ?? 0, now().getTime(), retryAfter), `http_${status}`, scope);
    report.failed += 1;
  }

  const messages = scope ? pendingMessages(db, limit, scope).filter(message => message.accountId === userId) : pendingMessages(db, limit);
  for (const msg of messages) {
    report.attempted += 1;
    let status: number;
    let retryAfter: string | null = null;
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
      retryAfter = response.headers?.get('Retry-After') ?? null;
    } catch {
      scheduleMessageRetry(db, msg.uuid, nextRetryAt(msg.retryCount ?? 0, now().getTime(), null), 'network_error', scope);
      report.failed += 1;
      continue;
    }

    if (status === 401) { report.failed += 1; report.sessionExpired = true; return report; }
    if (status === 408 || status === 429 || status >= 500) {
      scheduleMessageRetry(db, msg.uuid, nextRetryAt(msg.retryCount ?? 0, now().getTime(), retryAfter), `http_${status}`, scope);
      report.failed += 1;
      if (status === 429) return report;
      continue;
    }
    if (status < 300) {
      markMessageSynced(db, msg.uuid, now().toISOString(), scope);
      report.synced += 1;
      continue;
    }
    if (status >= 400 && status < 500) {
      markMessageNeedsAttention(db, msg.uuid, `http_${status}`, scope);
      report.failed += 1;
      continue;
    }
    scheduleMessageRetry(db, msg.uuid, nextRetryAt(msg.retryCount ?? 0, now().getTime(), retryAfter), `http_${status}`, scope);
    report.failed += 1;
  }

  return report;
}
