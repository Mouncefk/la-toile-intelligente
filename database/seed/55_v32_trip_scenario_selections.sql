CREATE TABLE IF NOT EXISTS v32_trip_scenario_selections (
 id BIGSERIAL PRIMARY KEY,
 trip_draft_id BIGINT NOT NULL REFERENCES v30_trip_drafts(id) ON DELETE CASCADE,
 scenario_key TEXT NOT NULL CHECK (scenario_key IN ('comfort','balanced','discovery')),
 selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_v32_trip_scenario_selections_draft ON v32_trip_scenario_selections(trip_draft_id);