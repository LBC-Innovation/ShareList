-- sharelist_sync_log
-- Tracks which provider_track_ids have already been pushed to each sharelist_link.
-- Used by CrossSyncService to avoid adding duplicate tracks on subsequent syncs.

CREATE TABLE IF NOT EXISTS sharelist_sync_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sharelist_link_id   uuid        NOT NULL REFERENCES sharelist_links(id) ON DELETE CASCADE,
  provider_track_id   text        NOT NULL,
  synced_at           timestamptz NOT NULL DEFAULT now(),

  UNIQUE (sharelist_link_id, provider_track_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_log_link_id
  ON sharelist_sync_log (sharelist_link_id);

COMMENT ON TABLE sharelist_sync_log IS
  'Records every (link, track) pair that cross-sync has already pushed, preventing duplicate adds.';
