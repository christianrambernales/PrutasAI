-- Migration 006: Account and sync security schema
-- Non-destructive additive migration: preserves existing rows, photo paths, and timestamps.

-- 1. scan table: account ownership, updated_at, and sync state
ALTER TABLE scan ADD COLUMN account_id TEXT;
ALTER TABLE scan ADD COLUMN updated_at TEXT;
ALTER TABLE scan ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'needs_attention', 'conflict'));
ALTER TABLE scan ADD COLUMN sync_error_code TEXT;
ALTER TABLE scan ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scan ADD COLUMN next_retry_at TEXT;

UPDATE scan SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE scan SET sync_status = 'synced' WHERE synced_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scan_account_created ON scan(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_account_sync ON scan(account_id, sync_status, next_retry_at);

-- 2. conversation table: account ownership and sync state (updated_at already exists)
ALTER TABLE conversation ADD COLUMN account_id TEXT;
ALTER TABLE conversation ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'needs_attention', 'conflict'));
ALTER TABLE conversation ADD COLUMN sync_error_code TEXT;
ALTER TABLE conversation ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversation ADD COLUMN next_retry_at TEXT;

UPDATE conversation SET sync_status = 'synced' WHERE synced_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_account_updated ON conversation(account_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_account_sync ON conversation(account_id, sync_status, next_retry_at);

-- 3. conversation_message table: account ownership, updated_at, and sync state
ALTER TABLE conversation_message ADD COLUMN account_id TEXT;
ALTER TABLE conversation_message ADD COLUMN updated_at TEXT;
ALTER TABLE conversation_message ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'needs_attention', 'conflict'));
ALTER TABLE conversation_message ADD COLUMN sync_error_code TEXT;
ALTER TABLE conversation_message ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversation_message ADD COLUMN next_retry_at TEXT;

UPDATE conversation_message SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE conversation_message SET sync_status = 'synced' WHERE synced_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_message_account_sync ON conversation_message(account_id, sync_status, next_retry_at);
