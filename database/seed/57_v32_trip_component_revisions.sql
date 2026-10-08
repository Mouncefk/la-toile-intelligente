CREATE TABLE IF NOT EXISTS v32_trip_component_revisions (
 id BIGSERIAL PRIMARY KEY,
 trip_draft_id BIGINT NOT NULL REFERENCES v30_trip_drafts(id) ON DELETE CASCADE,
 component_type TEXT NOT NULL CHECK (component_type IN ('transport','accommodation','experiences')),
 previous_offer_id BIGINT,
 new_offer_id BIGINT NOT NULL,
 revised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);