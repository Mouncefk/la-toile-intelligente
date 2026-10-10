CREATE TABLE IF NOT EXISTS v30_trip_drafts (
 id BIGSERIAL PRIMARY KEY,
 traveler_id BIGINT,
 session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 title TEXT NOT NULL DEFAULT 'Mon voyage',
 territory_key TEXT REFERENCES v30_territories(territory_key) ON DELETE SET NULL,
 status TEXT NOT NULL DEFAULT 'preparation' CHECK(status IN ('preparation','ready','archived')),
 transport JSONB NOT NULL DEFAULT '{}'::jsonb,
 accommodation JSONB NOT NULL DEFAULT '{}'::jsonb,
 experiences JSONB NOT NULL DEFAULT '[]'::jsonb,
 health_safety JSONB NOT NULL DEFAULT '[]'::jsonb,
 notes JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(session_id)
);
CREATE INDEX IF NOT EXISTS idx_v30_trip_drafts_session ON v30_trip_drafts(session_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_v30_trip_drafts_traveler ON v30_trip_drafts(traveler_id,updated_at DESC);
