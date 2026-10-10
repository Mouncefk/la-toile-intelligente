CREATE TABLE IF NOT EXISTS v32_trip_improvement_feedback (
 id BIGSERIAL PRIMARY KEY,
 trip_draft_id BIGINT NOT NULL REFERENCES v30_trip_drafts(id) ON DELETE CASCADE,
 proposal_key TEXT NOT NULL,
 decision TEXT NOT NULL CHECK (decision IN ('accepted','rejected','deferred')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);