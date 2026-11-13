import type { SqlDriver } from '../driver';
import { buildScopeCondition, type LocalAccountScope, type SyncStatus } from './scans';

export type { LocalAccountScope, SyncStatus };

const HEX = '0123456789abcdef';

function hex(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += HEX[Math.floor(Math.random() * 16)];
  return out;
}

/**
 * Structural, not the DOM `Crypto` type: this module is compiled for both the
 * web build and Hermes, and Hermes ships no crypto global at all.
 */
type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: <T extends Uint8Array>(array: T) => T;
};

function platformCrypto(): CryptoLike | undefined {
  return (globalThis as { crypto?: CryptoLike }).crypto;
}

/** A v4 UUID built from 16 CSPRNG bytes, with the version and variant bits set. */
function uuidFromRandomBytes(getRandomValues: NonNullable<CryptoLike['getRandomValues']>): string {
  const bytes = getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const s = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/**
 * A version-4 UUID, shaped the way the server's validation expects.
 *
 * The platform CSPRNG first, because these ids are the primary key locally and
 * remotely at once and a collision is swallowed twice over — `INSERT OR IGNORE`
 * here, an ownership-checked upsert on the server — so a duplicate would lose a
 * message with no error raised anywhere. `Math.random` is a last resort for a
 * runtime that exposes no crypto global; the shape is identical, the entropy is
 * not.
 */
function newUuid(): string {
  const crypto = platformCrypto();
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  if (typeof crypto?.getRandomValues === 'function') {
    return uuidFromRandomBytes(crypto.getRandomValues.bind(crypto));
  }
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${HEX[8 + Math.floor(Math.random() * 4)]}${hex(3)}-${hex(12)}`;
}

export function newConversationUuid(): string {
  return newUuid();
}

/**
 * Message ids are UUIDs for the same two reasons conversation ids are: the
 * sync endpoint rejects anything else outright, and an id minted from a
 * per-session counter restarts at zero on the next launch, where
 * `INSERT OR IGNORE` would silently drop the colliding row.
 */
export function newMessageUuid(): string {
  return newUuid();
}

export interface NewConversation {
  uuid: string;
  title: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  /** Trash state, carried so a restore rebuilds a trashed conversation as trashed. */
  deletedAt?: string | null;
  syncedAt?: string | null;
  accountId?: string | null;
  syncStatus?: SyncStatus;
  syncErrorCode?: string | null;
  retryCount?: number;
  nextRetryAt?: string | null;
}

export interface ConversationSummary {
  uuid: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  accountId?: string | null;
  syncStatus?: SyncStatus;
  syncErrorCode?: string | null;
  retryCount?: number;
  nextRetryAt?: string | null;
}

export interface NewMessage {
  uuid: string;
  conversationId: string;
  role: 'user' | 'assistant';
  kind: string | null;
  text: string;
  verdictJson: string | null;
  createdAt: string;
  updatedAt?: string;
  syncedAt?: string | null;
  accountId?: string | null;
  syncStatus?: SyncStatus;
  syncErrorCode?: string | null;
  retryCount?: number;
  nextRetryAt?: string | null;
}

export interface StoredMessage {
  uuid: string;
  conversationId: string;
  role: 'user' | 'assistant';
  kind: string | null;
  text: string;
  verdictJson: string | null;
  createdAt: string;
  updatedAt?: string;
  accountId?: string | null;
  syncStatus?: SyncStatus;
  syncErrorCode?: string | null;
  retryCount?: number;
  nextRetryAt?: string | null;
}

export function insertConversation(db: SqlDriver, c: NewConversation): void {
  const syncStatus: SyncStatus = c.syncStatus ?? (c.syncedAt ? 'synced' : 'pending');
  // INSERT OR IGNORE: replaying a queue or sync restore must not duplicate or overwrite a locally-held row
  db.all(
    `INSERT OR IGNORE INTO conversation
       (uuid, title, device_id, created_at, updated_at, deleted_at, synced_at,
        account_id, sync_status, sync_error_code, retry_count, next_retry_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING uuid`,
    [
      c.uuid,
      c.title,
      c.deviceId,
      c.createdAt,
      c.updatedAt,
      c.deletedAt ?? null,
      c.syncedAt ?? null,
      c.accountId ?? null,
      syncStatus,
      c.syncErrorCode ?? null,
      c.retryCount ?? 0,
      c.nextRetryAt ?? null,
    ],
  );
}

export function insertMessage(db: SqlDriver, m: NewMessage): void {
  const parent = db.get<{ account_id: string | null }>(
    'SELECT account_id FROM conversation WHERE uuid = ?',
    [m.conversationId],
  );
  if (!parent) {
    throw new Error(`Parent conversation ${m.conversationId} not found`);
  }
  // Enforce parent ownership matching: message cannot mismatch parent conversation owner
  if (m.accountId !== undefined && m.accountId !== parent.account_id) {
    throw new Error(
      `Message account_id (${m.accountId}) does not match parent conversation owner (${parent.account_id})`,
    );
  }

  const accountId = parent.account_id;
  const updatedAt = m.updatedAt ?? m.createdAt;
  const syncStatus: SyncStatus = m.syncStatus ?? (m.syncedAt ? 'synced' : 'pending');

  // INSERT OR IGNORE: replaying a queue or sync restore must not duplicate or overwrite a locally-held row
  db.all(
    `INSERT OR IGNORE INTO conversation_message
       (uuid, conversation_id, role, kind, text, verdict_json, created_at, updated_at, synced_at,
        account_id, sync_status, sync_error_code, retry_count, next_retry_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING uuid`,
    [
      m.uuid,
      m.conversationId,
      m.role,
      m.kind,
      m.text,
      m.verdictJson,
      m.createdAt,
      updatedAt,
      m.syncedAt ?? null,
      accountId,
      syncStatus,
      m.syncErrorCode ?? null,
      m.retryCount ?? 0,
      m.nextRetryAt ?? null,
    ],
  );
}

function toSummary(row: {
  uuid: string;
  title: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  account_id?: string | null;
  sync_status?: SyncStatus;
  sync_error_code?: string | null;
  retry_count?: number;
  next_retry_at?: string | null;
}): ConversationSummary {
  return {
    uuid: row.uuid,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    accountId: row.account_id,
    syncStatus: row.sync_status,
    syncErrorCode: row.sync_error_code,
    retryCount: row.retry_count,
    nextRetryAt: row.next_retry_at,
  };
}

export function listActiveConversations(
  db: SqlDriver,
  scope: LocalAccountScope = { activeAccountId: null },
): ConversationSummary[] {
  const { clause, params } = buildScopeCondition(scope, 'conversation');
  return db
    .all<{
      uuid: string; title: string; created_at: string; updated_at: string; deleted_at: string | null;
      account_id: string | null; sync_status: SyncStatus; sync_error_code: string | null;
      retry_count: number; next_retry_at: string | null;
    }>(
      `SELECT uuid, title, created_at, updated_at, deleted_at,
              account_id, sync_status, sync_error_code, retry_count, next_retry_at
         FROM conversation
        WHERE deleted_at IS NULL AND ${clause}
        ORDER BY updated_at DESC`,
      params,
    )
    .map(toSummary);
}

export function listTrashedConversations(
  db: SqlDriver,
  scope: LocalAccountScope = { activeAccountId: null },
): ConversationSummary[] {
  const { clause, params } = buildScopeCondition(scope, 'conversation');
  return db
    .all<{
      uuid: string; title: string; created_at: string; updated_at: string; deleted_at: string | null;
      account_id: string | null; sync_status: SyncStatus; sync_error_code: string | null;
      retry_count: number; next_retry_at: string | null;
    }>(
      `SELECT uuid, title, created_at, updated_at, deleted_at,
              account_id, sync_status, sync_error_code, retry_count, next_retry_at
         FROM conversation
        WHERE deleted_at IS NOT NULL AND ${clause}
        ORDER BY deleted_at DESC`,
      params,
    )
    .map(toSummary);
}

export function findConversation(
  db: SqlDriver,
  uuid: string,
  scope: LocalAccountScope = { activeAccountId: null },
): ConversationSummary | null {
  const { clause, params } = buildScopeCondition(scope, 'conversation');
  const row = db.get<{
    uuid: string; title: string; created_at: string; updated_at: string; deleted_at: string | null;
    account_id: string | null; sync_status: SyncStatus; sync_error_code: string | null;
    retry_count: number; next_retry_at: string | null;
  }>(
    `SELECT uuid, title, created_at, updated_at, deleted_at,
            account_id, sync_status, sync_error_code, retry_count, next_retry_at
       FROM conversation
      WHERE uuid = ? AND ${clause}`,
    [uuid, ...params],
  );
  return row ? toSummary(row) : null;
}

function toMessage(row: {
  uuid: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  kind: string | null;
  text: string;
  verdict_json: string | null;
  created_at: string;
  updated_at?: string;
  account_id?: string | null;
  sync_status?: SyncStatus;
  sync_error_code?: string | null;
  retry_count?: number;
  next_retry_at?: string | null;
}): StoredMessage {
  return {
    uuid: row.uuid,
    conversationId: row.conversation_id,
    role: row.role,
    kind: row.kind,
    text: row.text,
    verdictJson: row.verdict_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    accountId: row.account_id,
    syncStatus: row.sync_status,
    syncErrorCode: row.sync_error_code,
    retryCount: row.retry_count,
    nextRetryAt: row.next_retry_at,
  };
}

export function listMessages(
  db: SqlDriver,
  conversationId: string,
  scope: LocalAccountScope = { activeAccountId: null },
): StoredMessage[] {
  const { clause, params } = buildScopeCondition(scope, 'c');
  return db
    .all<{
      uuid: string; conversation_id: string; role: 'user' | 'assistant'; kind: string | null;
      text: string; verdict_json: string | null; created_at: string; updated_at: string;
      account_id: string | null; sync_status: SyncStatus; sync_error_code: string | null;
      retry_count: number; next_retry_at: string | null;
    }>(
      `SELECT m.uuid, m.conversation_id, m.role, m.kind, m.text, m.verdict_json,
              m.created_at, m.updated_at, m.account_id, m.sync_status, m.sync_error_code,
              m.retry_count, m.next_retry_at
         FROM conversation_message m
         JOIN conversation c ON c.uuid = m.conversation_id
        WHERE m.conversation_id = ? AND ${clause}
        ORDER BY m.created_at ASC`,
      [conversationId, ...params],
    )
    .map(toMessage);
}

/** The most recent `limit` messages, returned oldest-first for feeding to the model. */
export function lastMessages(
  db: SqlDriver,
  conversationId: string,
  limit: number,
  scope: LocalAccountScope = { activeAccountId: null },
): StoredMessage[] {
  const { clause, params } = buildScopeCondition(scope, 'c');
  const rows = db
    .all<{
      uuid: string; conversation_id: string; role: 'user' | 'assistant'; kind: string | null;
      text: string; verdict_json: string | null; created_at: string; updated_at: string;
      account_id: string | null; sync_status: SyncStatus; sync_error_code: string | null;
      retry_count: number; next_retry_at: string | null;
    }>(
      `SELECT m.uuid, m.conversation_id, m.role, m.kind, m.text, m.verdict_json,
              m.created_at, m.updated_at, m.account_id, m.sync_status, m.sync_error_code,
              m.retry_count, m.next_retry_at
         FROM conversation_message m
         JOIN conversation c ON c.uuid = m.conversation_id
        WHERE m.conversation_id = ? AND ${clause}
        ORDER BY m.created_at DESC
        LIMIT ?`,
      [conversationId, ...params, limit],
    )
    .map(toMessage);
  return rows.reverse();
}

/**
 * Rewrites one message's text in place.
 *
 * `sync_status = 'pending'` re-queues the row. `created_at` is deliberately left
 * alone — it is what orders the thread, so moving it would shuffle the
 * message to the bottom of its own conversation.
 */
export function updateMessageText(
  db: SqlDriver,
  uuid: string,
  text: string,
  scope?: LocalAccountScope,
  nowIso: string = new Date().toISOString(),
): void {
  let where = 'uuid = ?';
  const params: unknown[] = [text, nowIso, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation_message');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  db.all(
    `UPDATE conversation_message
        SET text = ?,
            updated_at = ?,
            sync_status = 'pending',
            synced_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
}

/**
 * Marks a conversation as just-changed. Adding a message is a change to the
 * conversation, and `listActiveConversations` orders by `updated_at`, so
 * without this a thread you replied in a minute ago sorts below one you have
 * not touched in a week.
 */
export function touchConversation(
  db: SqlDriver,
  uuid: string,
  now: string,
  scope?: LocalAccountScope,
): void {
  let where = 'uuid = ?';
  const params: unknown[] = [now, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  db.all(
    `UPDATE conversation
        SET updated_at = ?,
            sync_status = 'pending',
            synced_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
}

export function renameConversation(
  db: SqlDriver,
  uuid: string,
  title: string,
  now: string,
  scope?: LocalAccountScope,
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [title, now, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const result = db.all<{ uuid: string }>(
    `UPDATE conversation
        SET title = ?,
            updated_at = ?,
            sync_status = 'pending',
            synced_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return result.length > 0;
}

export function softDeleteConversation(
  db: SqlDriver,
  uuid: string,
  now: string,
  scope?: LocalAccountScope,
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [now, now, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const result = db.all<{ uuid: string }>(
    `UPDATE conversation
        SET deleted_at = ?,
            updated_at = ?,
            sync_status = 'pending',
            synced_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return result.length > 0;
}

export function restoreConversation(
  db: SqlDriver,
  uuid: string,
  now: string,
  scope?: LocalAccountScope,
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [now, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const result = db.all<{ uuid: string }>(
    `UPDATE conversation
        SET deleted_at = NULL,
            updated_at = ?,
            sync_status = 'pending',
            synced_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return result.length > 0;
}

/**
 * Deletes the conversation and its messages.
 *
 * The child rows go explicitly rather than through ON DELETE CASCADE:
 * SQLite leaves `foreign_keys` OFF unless a connection turns it on, and
 * nothing in this app does, so the cascade would silently orphan every
 * message the purge was meant to erase.
 */
export function hardDeleteConversation(
  db: SqlDriver,
  uuid: string,
  scope?: LocalAccountScope,
): void {
  db.transaction(() => {
    let msgWhere = 'conversation_id = ?';
    let convWhere = 'uuid = ?';
    const msgParams: unknown[] = [uuid];
    const convParams: unknown[] = [uuid];
    if (scope) {
      const { clause: msgClause, params: msgScopeParams } = buildScopeCondition(scope, 'conversation_message');
      msgWhere += ` AND ${msgClause}`;
      msgParams.push(...msgScopeParams);
      const { clause: convClause, params: convScopeParams } = buildScopeCondition(scope, 'conversation');
      convWhere += ` AND ${convClause}`;
      convParams.push(...convScopeParams);
    }
    db.all(`DELETE FROM conversation_message WHERE ${msgWhere} RETURNING uuid`, msgParams);
    db.all(`DELETE FROM conversation WHERE ${convWhere} RETURNING uuid`, convParams);
  });
}

/** Trashed conversations whose deleted_at is older than the cutoff — due for the purge sweep. */
export function conversationsPastRetention(
  db: SqlDriver,
  cutoffIso: string,
  scope?: LocalAccountScope,
): string[] {
  let where = 'deleted_at IS NOT NULL AND deleted_at < ?';
  const params: unknown[] = [cutoffIso];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  return db
    .all<{ uuid: string }>(
      `SELECT uuid FROM conversation WHERE ${where}`,
      params,
    )
    .map(r => r.uuid);
}

export type PendingConversation = ConversationSummary;

/** Conversations where sync_status = 'pending', oldest first. */
export function pendingConversations(
  db: SqlDriver,
  limitOrScope: number | LocalAccountScope = 50,
  scopeOrLimit: LocalAccountScope | number = { activeAccountId: null },
  nowIso?: string,
): PendingConversation[] {
  let limit = 50;
  let scope: LocalAccountScope = { activeAccountId: null };

  if (typeof limitOrScope === 'number') {
    limit = limitOrScope;
    if (typeof scopeOrLimit === 'object' && scopeOrLimit !== null && 'activeAccountId' in scopeOrLimit) {
      scope = scopeOrLimit;
    }
  } else if (typeof limitOrScope === 'object' && limitOrScope !== null && 'activeAccountId' in limitOrScope) {
    scope = limitOrScope;
    if (typeof scopeOrLimit === 'number') {
      limit = scopeOrLimit;
    }
  }

  const { clause, params } = buildScopeCondition(scope, 'conversation');
  const timeClause = nowIso ? 'AND (next_retry_at IS NULL OR next_retry_at <= ?)' : '';
  const timeParams = nowIso ? [nowIso] : [];

  return db
    .all<{
      uuid: string; title: string; created_at: string; updated_at: string; deleted_at: string | null;
      account_id: string | null; sync_status: SyncStatus; sync_error_code: string | null;
      retry_count: number; next_retry_at: string | null;
    }>(
      `SELECT uuid, title, created_at, updated_at, deleted_at,
              account_id, sync_status, sync_error_code, retry_count, next_retry_at
         FROM conversation
        WHERE sync_status = 'pending' AND ${clause} ${timeClause}
        ORDER BY created_at ASC
        LIMIT ?`,
      [...params, ...timeParams, limit],
    )
    .map(toSummary);
}

export function markConversationSynced(
  db: SqlDriver,
  uuid: string,
  syncedAt: string,
  scope?: LocalAccountScope,
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [syncedAt, syncedAt, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE conversation
        SET sync_status = 'synced',
            synced_at = ?,
            updated_at = ?,
            sync_error_code = NULL,
            retry_count = 0,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function markConversationNeedsAttention(
  db: SqlDriver,
  uuid: string,
  errorCode: string,
  scope?: LocalAccountScope,
  nowIso: string = new Date().toISOString(),
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [errorCode, nowIso, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE conversation
        SET sync_status = 'needs_attention',
            sync_error_code = ?,
            updated_at = ?,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function markConversationConflict(
  db: SqlDriver,
  uuid: string,
  errorCode: string,
  scope?: LocalAccountScope,
  nowIso: string = new Date().toISOString(),
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [errorCode, nowIso, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE conversation
        SET sync_status = 'conflict',
            sync_error_code = ?,
            updated_at = ?,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function scheduleConversationRetry(
  db: SqlDriver,
  uuid: string,
  nextRetryAt: string,
  errorCode: string | null = null,
  scope?: LocalAccountScope,
  nowIso: string = new Date().toISOString(),
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [nextRetryAt, errorCode, nowIso, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE conversation
        SET sync_status = 'pending',
            next_retry_at = ?,
            sync_error_code = ?,
            retry_count = retry_count + 1,
            updated_at = ?
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function resetConversationSyncQueue(db: SqlDriver, scope?: LocalAccountScope): void {
  let where = '1 = 1';
  const params: unknown[] = [];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation');
    where = clause;
    params.push(...scopeParams);
  }
  db.all(
    `UPDATE conversation
        SET sync_status = 'pending',
            synced_at = NULL,
            sync_error_code = NULL,
            retry_count = 0,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
}

export type PendingMessage = StoredMessage;

export function pendingMessages(
  db: SqlDriver,
  limitOrScope: number | LocalAccountScope = 50,
  scopeOrLimit: LocalAccountScope | number = { activeAccountId: null },
  nowIso?: string,
): PendingMessage[] {
  let limit = 50;
  let scope: LocalAccountScope = { activeAccountId: null };

  if (typeof limitOrScope === 'number') {
    limit = limitOrScope;
    if (typeof scopeOrLimit === 'object' && scopeOrLimit !== null && 'activeAccountId' in scopeOrLimit) {
      scope = scopeOrLimit;
    }
  } else if (typeof limitOrScope === 'object' && limitOrScope !== null && 'activeAccountId' in limitOrScope) {
    scope = limitOrScope;
    if (typeof scopeOrLimit === 'number') {
      limit = scopeOrLimit;
    }
  }

  const { clause, params } = buildScopeCondition(scope, 'conversation_message');
  const timeClause = nowIso ? 'AND (next_retry_at IS NULL OR next_retry_at <= ?)' : '';
  const timeParams = nowIso ? [nowIso] : [];

  return db
    .all<{
      uuid: string; conversation_id: string; role: 'user' | 'assistant'; kind: string | null;
      text: string; verdict_json: string | null; created_at: string; updated_at: string;
      account_id: string | null; sync_status: SyncStatus; sync_error_code: string | null;
      retry_count: number; next_retry_at: string | null;
    }>(
      `SELECT uuid, conversation_id, role, kind, text, verdict_json, created_at, updated_at,
              account_id, sync_status, sync_error_code, retry_count, next_retry_at
         FROM conversation_message
        WHERE sync_status = 'pending' AND ${clause} ${timeClause}
        ORDER BY created_at ASC
        LIMIT ?`,
      [...params, ...timeParams, limit],
    )
    .map(toMessage);
}

export function markMessageSynced(
  db: SqlDriver,
  uuid: string,
  syncedAt: string,
  scope?: LocalAccountScope,
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [syncedAt, syncedAt, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation_message');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE conversation_message
        SET sync_status = 'synced',
            synced_at = ?,
            updated_at = ?,
            sync_error_code = NULL,
            retry_count = 0,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function markMessageNeedsAttention(
  db: SqlDriver,
  uuid: string,
  errorCode: string,
  scope?: LocalAccountScope,
  nowIso: string = new Date().toISOString(),
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [errorCode, nowIso, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation_message');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE conversation_message
        SET sync_status = 'needs_attention',
            sync_error_code = ?,
            updated_at = ?,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function markMessageConflict(
  db: SqlDriver,
  uuid: string,
  errorCode: string,
  scope?: LocalAccountScope,
  nowIso: string = new Date().toISOString(),
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [errorCode, nowIso, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation_message');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE conversation_message
        SET sync_status = 'conflict',
            sync_error_code = ?,
            updated_at = ?,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function scheduleMessageRetry(
  db: SqlDriver,
  uuid: string,
  nextRetryAt: string,
  errorCode: string | null = null,
  scope?: LocalAccountScope,
  nowIso: string = new Date().toISOString(),
): boolean {
  let where = 'uuid = ?';
  const params: unknown[] = [nextRetryAt, errorCode, nowIso, uuid];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation_message');
    where += ` AND ${clause}`;
    params.push(...scopeParams);
  }
  const rows = db.all<{ uuid: string }>(
    `UPDATE conversation_message
        SET sync_status = 'pending',
            next_retry_at = ?,
            sync_error_code = ?,
            retry_count = retry_count + 1,
            updated_at = ?
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
  return rows.length > 0;
}

export function resetMessageSyncQueue(db: SqlDriver, scope?: LocalAccountScope): void {
  let where = '1 = 1';
  const params: unknown[] = [];
  if (scope) {
    const { clause, params: scopeParams } = buildScopeCondition(scope, 'conversation_message');
    where = clause;
    params.push(...scopeParams);
  }
  db.all(
    `UPDATE conversation_message
        SET sync_status = 'pending',
            synced_at = NULL,
            sync_error_code = NULL,
            retry_count = 0,
            next_retry_at = NULL
      WHERE ${where}
      RETURNING uuid`,
    params,
  );
}

export function countConversationsBySyncStatus(
  db: SqlDriver,
  scope: LocalAccountScope = { activeAccountId: null },
): Record<SyncStatus, number> {
  const { clause, params } = buildScopeCondition(scope, 'conversation');
  const rows = db.all<{ sync_status: SyncStatus; count: number }>(
    `SELECT sync_status, COUNT(*) as count
       FROM conversation
      WHERE ${clause}
      GROUP BY sync_status`,
    params,
  );
  const counts: Record<SyncStatus, number> = {
    pending: 0,
    synced: 0,
    needs_attention: 0,
    conflict: 0,
  };
  for (const row of rows) {
    if (row.sync_status in counts) {
      counts[row.sync_status] = Number(row.count);
    }
  }
  return counts;
}

/**
 * Claim unowned conversations and their child messages for the active account.
 * Atomically re-assigns unowned conversations (`account_id IS NULL`) and their
 * unowned messages in a single transaction.
 * Can NEVER reassign an already-owned row belonging to another user.
 */
export function claimUnownedConversations(
  db: SqlDriver,
  accountId: string,
  nowIso: string = new Date().toISOString(),
): { claimedConversations: number; claimedMessages: number } {
  if (!accountId || !accountId.trim()) {
    throw new Error('accountId must be a non-empty string');
  }
  let result = { claimedConversations: 0, claimedMessages: 0 };
  db.transaction(() => {
    const unownedConvs = db.all<{ uuid: string }>(
      'SELECT uuid FROM conversation WHERE account_id IS NULL',
    );
    if (unownedConvs.length === 0) {
      result = { claimedConversations: 0, claimedMessages: 0 };
      return;
    }
    const convIds = unownedConvs.map(c => c.uuid);

    db.all(
      `UPDATE conversation
          SET account_id = ?,
              updated_at = ?,
              sync_status = 'pending',
              synced_at = NULL
        WHERE account_id IS NULL
        RETURNING uuid`,
      [accountId, nowIso],
    );

    const claimedMsgs = db.all(
      `UPDATE conversation_message
          SET account_id = ?,
              updated_at = ?,
              sync_status = 'pending',
              synced_at = NULL
        WHERE account_id IS NULL
          AND conversation_id IN (${convIds.map(() => '?').join(',')})
        RETURNING uuid`,
      [accountId, nowIso, ...convIds],
    );

    result = {
      claimedConversations: unownedConvs.length,
      claimedMessages: claimedMsgs.length,
    };
  });
  return result;
}

/**
 * Local-only removal of downloaded/local conversations and messages for the specified account.
 * Deletes ONLY rows belonging to `accountId` from SQLite.
 * Never affects unowned rows, never touches other accounts, and never emits a cloud deletion.
 */
export function removeLocalAccountConversations(
  db: SqlDriver,
  accountId: string,
): { removedConversations: number; removedMessages: number } {
  if (!accountId || !accountId.trim()) {
    throw new Error('accountId must be a non-empty string');
  }
  let result = { removedConversations: 0, removedMessages: 0 };
  db.transaction(() => {
    const msgs = db.all<{ uuid: string }>(
      'DELETE FROM conversation_message WHERE account_id = ? RETURNING uuid',
      [accountId],
    );
    const convs = db.all<{ uuid: string }>(
      'DELETE FROM conversation WHERE account_id = ? RETURNING uuid',
      [accountId],
    );
    result = {
      removedConversations: convs.length,
      removedMessages: msgs.length,
    };
  });
  return result;
}
