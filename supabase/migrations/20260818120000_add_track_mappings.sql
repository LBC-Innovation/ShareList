-- track_mappings: cached cross-provider track identity (IDs and status only).

CREATE TABLE IF NOT EXISTS track_mappings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_provider  text NOT NULL,
  source_track_id  text NOT NULL,
  dest_provider    text NOT NULL,
  dest_track_id    text,
  status           text NOT NULL CHECK (status IN ('matched', 'unmatched', 'ambiguous')),
  method           text,
  checked_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (source_provider, source_track_id, dest_provider)
);

CREATE INDEX IF NOT EXISTS idx_track_mappings_dest
  ON track_mappings (dest_provider, dest_track_id)
  WHERE dest_track_id IS NOT NULL;

COMMENT ON TABLE track_mappings IS
  'Caches whether a source-provider track exists on a destination provider. Stores IDs only.';
