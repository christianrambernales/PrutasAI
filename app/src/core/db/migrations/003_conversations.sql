CREATE TABLE conversation (
  uuid       TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  device_id  TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  synced_at  TEXT
);

CREATE TABLE conversation_message (
  uuid            TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversation(uuid) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  kind            TEXT,
  text            TEXT NOT NULL,
  verdict_json    TEXT,
  created_at      TEXT NOT NULL,
  synced_at       TEXT
);

CREATE INDEX idx_conversation_message_conversation
  ON conversation_message(conversation_id, created_at);
