CREATE TABLE monitoring_session (
  id TEXT PRIMARY KEY,
  source_scan_id TEXT NOT NULL REFERENCES scan(uuid) ON DELETE CASCADE,
  account_id TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(source_scan_id, account_id)
);

CREATE TABLE monitoring_checkpoint (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES monitoring_session(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number IN (5, 10)),
  scheduled_date INTEGER NOT NULL,
  completed_date INTEGER,
  observation TEXT CHECK (observation IN ('better', 'same', 'worse', 'unsure') OR observation IS NULL),
  note TEXT,
  photo_uri TEXT,
  UNIQUE(session_id, day_number)
);
