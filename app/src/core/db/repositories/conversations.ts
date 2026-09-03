import type { SqlDriver } from '../driver';

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
}

export interface ConversationSummary {
  uuid: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NewMessage {
  uuid: string;
  conversationId: string;
  role: 'user' | 'assistant';
  kind: string | null;
  text: string;
  verdictJson: string | null;
  createdAt: string;
  syncedAt?: string | null;
}

export interface StoredMessage {
  uuid: string;
  conversationId: string;
  role: 'user' | 'assistant';
  kind: string | null;
  text: string;
  verdictJson: string | null;
  createdAt: string;
}

export function insertConversation(db: SqlDriver, c: NewConversation): void {
  // INSERT OR IGNORE: replaying a queue or sync restore must not duplicate or overwrite a locally-held row
  db.all(
    `INSERT OR IGNORE INTO conversation (uuid, title, device_id, created_at, updated_at, deleted_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING uuid`,
    [c.uuid, c.title, c.deviceId, c.createdAt, c.updatedAt, c.deletedAt ?? null, c.syncedAt ?? null],
  );
}

export function insertMessage(db: SqlDriver, m: NewMessage): void {
  // INSERT OR IGNORE: replaying a queue or sync restore must not duplicate or overwrite a locally-held row
  db.all(
    `INSERT OR IGNORE INTO conversation_message
       (uuid, conversation_id, role, kind, text, verdict_json, created_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING uuid`,
    [m.uuid, m.conversationId, m.role, m.kind, m.text, m.verdictJson, m.createdAt, m.syncedAt ?? null],
  );
}

function toSummary(row: {
  uuid: string; title: string; created_at: string; updated_at: string; deleted_at: string | null;
}): ConversationSummary {
  return { uuid: row.uuid, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at };
}

export function listActiveConversations(db: SqlDriver): ConversationSummary[] {
  return db
    .all<{ uuid: string; title: string; created_at: string; updated_at: string; deleted_at: string | null }>(
      `SELECT uuid, title, created_at, updated_at, deleted_at FROM conversation
        WHERE deleted_at IS NULL ORDER BY updated_at DESC`,
    )
    .map(toSummary);
}

export function listTrashedConversations(db: SqlDriver): ConversationSummary[] {
  return db
    .all<{ uuid: string; title: string; created_at: string; updated_at: string; deleted_at: string | null }>(
      `SELECT uuid, title, created_at, updated_at, deleted_at FROM conversation
        WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
    )
    .map(toSummary);
}

function toMessage(row: {
  uuid: string; conversation_id: string; role: 'user' | 'assistant'; kind: string | null;
  text: string; verdict_json: string | null; created_at: string;
}): StoredMessage {
  return {
    uuid: row.uuid, conversationId: row.conversation_id, role: row.role, kind: row.kind,
    text: row.text, verdictJson: row.verdict_json, createdAt: row.created_at,
  };
}

export function listMessages(db: SqlDriver, conversationId: string): StoredMessage[] {
  return db
    .all<{ uuid: string; conversation_id: string; role: 'user' | 'assistant'; kind: string | null; text: string; verdict_json: string | null; created_at: string }>(
      `SELECT uuid, conversation_id, role, kind, text, verdict_json, created_at
         FROM conversation_message WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversationId],
    )
    .map(toMessage);
}

/** The most recent `limit` messages, returned oldest-first for feeding to the model. */
export function lastMessages(db: SqlDriver, conversationId: string, limit: number): StoredMessage[] {
  const rows = db
    .all<{ uuid: string; conversation_id: string; role: 'user' | 'assistant'; kind: string | null; text: string; verdict_json: string | null; created_at: string }>(
      `SELECT uuid, conversation_id, role, kind, text, verdict_json, created_at
         FROM conversation_message WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?`,
      [conversationId, limit],
    )
    .map(toMessage);
  return rows.reverse();
}

/**
 * Rewrites one message's text in place.
 *
 * `synced_at = NULL` re-queues the row: the text the user is looking at is
 * the text every other device should get. `created_at` is deliberately left
 * alone — it is what orders the thread, so moving it would shuffle the
 * message to the bottom of its own conversation.
 */
export function updateMessageText(db: SqlDriver, uuid: string, text: string): void {
  db.all(
    'UPDATE conversation_message SET text = ?, synced_at = NULL WHERE uuid = ? RETURNING uuid',
    [text, uuid],
  );
}

/**
 * Marks a conversation as just-changed. Adding a message is a change to the
 * conversation, and `listActiveConversations` orders by `updated_at`, so
 * without this a thread you replied in a minute ago sorts below one you have
 * not touched in a week.
 */
export function touchConversation(db: SqlDriver, uuid: string, now: string): void {
  db.all(
    'UPDATE conversation SET updated_at = ?, synced_at = NULL WHERE uuid = ? RETURNING uuid',
    [now, uuid],
  );
}

export function renameConversation(db: SqlDriver, uuid: string, title: string, now: string): void {
  db.all(
    `UPDATE conversation SET title = ?, updated_at = ?, synced_at = NULL WHERE uuid = ? RETURNING uuid`,
    [title, now, uuid],
  );
}

export function softDeleteConversation(db: SqlDriver, uuid: string, now: string): void {
  db.all(
    `UPDATE conversation SET deleted_at = ?, updated_at = ?, synced_at = NULL WHERE uuid = ? RETURNING uuid`,
    [now, now, uuid],
  );
}

export function restoreConversation(db: SqlDriver, uuid: string, now: string): void {
  db.all(
    `UPDATE conversation SET deleted_at = NULL, updated_at = ?, synced_at = NULL WHERE uuid = ? RETURNING uuid`,
    [now, uuid],
  );
}

/**
 * Deletes the conversation and its messages.
 *
 * The child rows go explicitly rather than through ON DELETE CASCADE:
 * SQLite leaves `foreign_keys` OFF unless a connection turns it on, and
 * nothing in this app does, so the cascade would silently orphan every
 * message the purge was meant to erase.
 */
export function hardDeleteConversation(db: SqlDriver, uuid: string): void {
  db.all('DELETE FROM conversation_message WHERE conversation_id = ? RETURNING uuid', [uuid]);
  db.all('DELETE FROM conversation WHERE uuid = ? RETURNING uuid', [uuid]);
}

/** Trashed conversations whose deleted_at is older than the cutoff — due for the purge sweep. */
export function conversationsPastRetention(db: SqlDriver, cutoffIso: string): string[] {
  return db
    .all<{ uuid: string }>(
      'SELECT uuid FROM conversation WHERE deleted_at IS NOT NULL AND deleted_at < ?',
      [cutoffIso],
    )
    .map(r => r.uuid);
}

export type PendingConversation = ConversationSummary;

/** Conversations where synced_at IS NULL, oldest first. */
export function pendingConversations(db: SqlDriver, limit = 50): PendingConversation[] {
  return db
    .all<{ uuid: string; title: string; created_at: string; updated_at: string; deleted_at: string | null }>(
      `SELECT uuid, title, created_at, updated_at, deleted_at FROM conversation
        WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT ?`,
      [limit],
    )
    .map(toSummary);
}

export function markConversationSynced(db: SqlDriver, uuid: string, syncedAt: string): void {
  db.all('UPDATE conversation SET synced_at = ? WHERE uuid = ? RETURNING uuid', [syncedAt, uuid]);
}

export function resetConversationSyncQueue(db: SqlDriver): void {
  db.all('UPDATE conversation SET synced_at = NULL RETURNING uuid');
}

export type PendingMessage = StoredMessage;

export function pendingMessages(db: SqlDriver, limit = 50): PendingMessage[] {
  return db
    .all<{ uuid: string; conversation_id: string; role: 'user' | 'assistant'; kind: string | null; text: string; verdict_json: string | null; created_at: string }>(
      `SELECT uuid, conversation_id, role, kind, text, verdict_json, created_at
         FROM conversation_message WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT ?`,
      [limit],
    )
    .map(toMessage);
}

export function markMessageSynced(db: SqlDriver, uuid: string, syncedAt: string): void {
  db.all('UPDATE conversation_message SET synced_at = ? WHERE uuid = ? RETURNING uuid', [syncedAt, uuid]);
}

export function resetMessageSyncQueue(db: SqlDriver): void {
  db.all('UPDATE conversation_message SET synced_at = NULL RETURNING uuid');
}
