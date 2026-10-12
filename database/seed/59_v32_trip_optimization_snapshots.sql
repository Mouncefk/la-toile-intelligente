CREATE TABLE IF NOT EXISTS v32_trip_optimization_snapshots (
 id BIGSERIAL PRIMARY KEY,
 trip_draft_id BIGINT NOT NULL REFERENCES v30_trip_drafts(id) ON DELETE CASCADE,
 scenario_key TEXT,
 score INTEGER NOT NULL,
 dimensions JSONB NOT NULL DEFAULT '[]'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v32_trip_optimization_snapshots_draft ON v32_trip_optimization_snapshots(trip_draft_id,created_at DESC);