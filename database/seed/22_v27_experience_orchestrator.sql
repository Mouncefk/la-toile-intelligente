-- V27 Experience Orchestrator integration schema
CREATE TABLE IF NOT EXISTS experience_sessions_v27 (
  id BIGSERIAL PRIMARY KEY,
  traveler_id BIGINT,
  country_iso3 VARCHAR(3),
  stage TEXT NOT NULL DEFAULT 'intent',
  raw_text TEXT,
  intent JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id BIGINT,
  next_step TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE experience_sessions_v27
  ADD COLUMN IF NOT EXISTS request_id BIGINT;

CREATE TABLE IF NOT EXISTS experience_decisions_v27 (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES experience_sessions_v27(id) ON DELETE CASCADE,
  traveler_id BIGINT,
  request_id BIGINT,
  decision TEXT NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_sessions_v27_traveler
  ON experience_sessions_v27(traveler_id);

CREATE INDEX IF NOT EXISTS idx_experience_sessions_v27_request
  ON experience_sessions_v27(request_id);

CREATE INDEX IF NOT EXISTS idx_experience_decisions_v27_request
  ON experience_decisions_v27(request_id);
