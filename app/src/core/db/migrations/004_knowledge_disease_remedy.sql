CREATE TABLE IF NOT EXISTS disease (
  key            TEXT PRIMARY KEY,
  fruit_key      TEXT NOT NULL REFERENCES fruit(key),
  name_en        TEXT NOT NULL,
  name_fil       TEXT NOT NULL,
  description_en TEXT,
  description_fil TEXT,
  source_id      TEXT REFERENCES source(id)
);
CREATE INDEX IF NOT EXISTS idx_disease_fruit ON disease(fruit_key);

CREATE TABLE IF NOT EXISTS remedy (
  key            TEXT PRIMARY KEY,
  disease_key    TEXT NOT NULL REFERENCES disease(key),
  name_en        TEXT NOT NULL,
  name_fil       TEXT NOT NULL,
  instruction_en TEXT,
  instruction_fil TEXT,
  is_prevention  INTEGER NOT NULL DEFAULT 0,
  source_id      TEXT REFERENCES source(id)
);
CREATE INDEX IF NOT EXISTS idx_remedy_disease ON remedy(disease_key);
