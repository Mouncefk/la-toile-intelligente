CREATE TABLE IF NOT EXISTS v32_trip_component_selections (
 id BIGSERIAL PRIMARY KEY,
 trip_draft_id BIGINT NOT NULL REFERENCES v30_trip_drafts(id) ON DELETE CASCADE,
 component_type TEXT NOT NULL CHECK (component_type IN ('transport','accommodation','experiences')),
 offer_id BIGINT NOT NULL,
 selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_v32_trip_component_selections_draft ON v32_trip_component_selections(trip_draft_id);