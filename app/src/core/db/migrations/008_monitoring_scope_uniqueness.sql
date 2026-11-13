-- SQLite treats NULL values as distinct in a UNIQUE constraint. Monitoring
-- sessions for anonymous scans use NULL ownership, so version 7 could have
-- created duplicate anonymous sessions for a source scan. Repair those rows
-- before creating the stricter index.
--
-- The retained session is deterministic: earliest created_at, then lexical ID.
-- For colliding Day 5/10 rows retain the most complete record; ties retain the
-- later actual completion, then lexical ID. This preserves one usable
-- observation slot per day without inventing any agronomic fact.
CREATE TEMP TABLE monitoring_session_repair_map AS
SELECT duplicate_session.id AS duplicate_id,
       (
         SELECT keeper.id
           FROM monitoring_session AS keeper
          WHERE keeper.source_scan_id = duplicate_session.source_scan_id
            AND keeper.account_id IS NULL
          ORDER BY keeper.created_at ASC, keeper.id ASC
          LIMIT 1
       ) AS keeper_id
  FROM monitoring_session AS duplicate_session
 WHERE duplicate_session.account_id IS NULL
   AND duplicate_session.id != (
         SELECT keeper.id
           FROM monitoring_session AS keeper
          WHERE keeper.source_scan_id = duplicate_session.source_scan_id
            AND keeper.account_id IS NULL
          ORDER BY keeper.created_at ASC, keeper.id ASC
          LIMIT 1
       );

CREATE TEMP TABLE monitoring_checkpoint_repair AS
SELECT id, session_id, day_number, scheduled_date, completed_date, observation, note, photo_uri
  FROM (
    SELECT checkpoint.id,
           COALESCE(repair_map.keeper_id, checkpoint.session_id) AS session_id,
           checkpoint.day_number,
           checkpoint.scheduled_date,
           checkpoint.completed_date,
           checkpoint.observation,
           checkpoint.note,
           checkpoint.photo_uri,
           ROW_NUMBER() OVER (
             PARTITION BY COALESCE(repair_map.keeper_id, checkpoint.session_id), checkpoint.day_number
             ORDER BY (checkpoint.completed_date IS NOT NULL) DESC,
                      checkpoint.completed_date DESC,
                      checkpoint.id ASC
           ) AS repair_rank
      FROM monitoring_checkpoint AS checkpoint
      LEFT JOIN monitoring_session_repair_map AS repair_map
        ON repair_map.duplicate_id = checkpoint.session_id
     WHERE checkpoint.session_id IN (
       SELECT duplicate_id FROM monitoring_session_repair_map
       UNION
       SELECT keeper_id FROM monitoring_session_repair_map
     )
  )
 WHERE repair_rank = 1;

DELETE FROM monitoring_checkpoint
 WHERE session_id IN (
   SELECT duplicate_id FROM monitoring_session_repair_map
   UNION
   SELECT keeper_id FROM monitoring_session_repair_map
 );

INSERT INTO monitoring_checkpoint (
  id, session_id, day_number, scheduled_date, completed_date, observation, note, photo_uri
)
SELECT id, session_id, day_number, scheduled_date, completed_date, observation, note, photo_uri
  FROM monitoring_checkpoint_repair;

DELETE FROM monitoring_session
 WHERE id IN (SELECT duplicate_id FROM monitoring_session_repair_map);

DROP TABLE monitoring_checkpoint_repair;
DROP TABLE monitoring_session_repair_map;

-- Account IDs are non-empty application identifiers. The empty-string
-- sentinel gives anonymous sessions a concrete uniqueness key while keeping
-- account ownership nullable everywhere else.
CREATE UNIQUE INDEX IF NOT EXISTS idx_monitoring_session_source_scope
  ON monitoring_session(source_scan_id, COALESCE(account_id, ''));
