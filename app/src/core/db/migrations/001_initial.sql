CREATE TABLE IF NOT EXISTS schema_version (
  version    INTEGER NOT NULL,
  applied_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS source (
  id           TEXT PRIMARY KEY,
  citation     TEXT NOT NULL,
  url          TEXT,
  retrieved_at TEXT
);

CREATE TABLE IF NOT EXISTS fruit (
  key            TEXT PRIMARY KEY,
  name_en        TEXT NOT NULL,
  name_fil       TEXT NOT NULL,
  emoji          TEXT,
  ml_class_index INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS variety (
  key            TEXT PRIMARY KEY,
  fruit_key      TEXT NOT NULL REFERENCES fruit(key),
  name_en        TEXT NOT NULL,
  name_fil       TEXT NOT NULL,
  ml_class_index INTEGER,
  is_ml_class    INTEGER NOT NULL DEFAULT 0,
  parent_key     TEXT REFERENCES variety(key),
  source_id      TEXT REFERENCES source(id)
);
CREATE INDEX IF NOT EXISTS idx_variety_fruit ON variety(fruit_key);

CREATE TABLE IF NOT EXISTS scan (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid             TEXT NOT NULL UNIQUE,
  image_uri        TEXT NOT NULL,
  fruit_key        TEXT REFERENCES fruit(key),
  fruit_conf       REAL,
  variety_key      TEXT REFERENCES variety(key),
  variety_conf     REAL,
  bbox_json        TEXT,
  manifest_version INTEGER,
  created_at       TEXT NOT NULL,
  synced_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_scan_created ON scan(created_at DESC);

CREATE TABLE IF NOT EXISTS setting (
  key   TEXT PRIMARY KEY,
  value TEXT
);
