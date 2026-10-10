CREATE TABLE IF NOT EXISTS v32_trip_recalculation_events (
 id BIGSERIAL PRIMARY KEY,
 trip_draft_id BIGINT NOT NULL REFERENCES v30_trip_drafts(id) ON DELETE CASCADE,
 scenario_key TEXT,
 score INTEGER,
 reason TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);