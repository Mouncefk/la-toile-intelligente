-- V30 Phase 2 runtime persistence: traveler trip drafts
CREATE TABLE IF NOT EXISTS v30_trip_drafts (
 id BIGSERIAL PRIMARY KEY,
 session_id BIGINT NOT NULL UNIQUE REFERENCES v30_traveler_sessions(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 territory_key TEXT REFERENCES v30_territories(territory_key) ON DELETE SET NULL,
 status TEXT NOT NULL DEFAULT 'preparation' CHECK(status IN ('preparation','ready','in_progress','completed')),
 transport JSONB NOT NULL DEFAULT '{}'::jsonb,
 notes JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v30_trip_drafts_session ON v30_trip_drafts(session_id);
