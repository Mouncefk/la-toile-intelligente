
-- La Toile V26 — Guide Virtuel / Contextual Travel Companion Core
-- International guide orchestration layer over Knowledge + Intent + Journey + AI.

CREATE TABLE IF NOT EXISTS guide_profiles_v26 (
  id BIGSERIAL PRIMARY KEY,
  traveler_id BIGINT,
  guide_name TEXT,
  language_code TEXT NOT NULL DEFAULT 'fr',
  tone TEXT NOT NULL DEFAULT 'concierge',
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guide_sessions_v26 (
  id BIGSERIAL PRIMARY KEY,
  guide_profile_id BIGINT NOT NULL REFERENCES guide_profiles_v26(id) ON DELETE CASCADE,
  trip_id BIGINT,
  country_iso3 CHAR(3),
  city_id BIGINT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS guide_messages_v26 (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES guide_sessions_v26(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('traveler','guide','system')),
  message TEXT NOT NULL,
  intent JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guide_context_events_v26 (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES guide_sessions_v26(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guide_actions_v26 (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES guide_sessions_v26(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id BIGINT,
  explanation TEXT,
  status TEXT NOT NULL DEFAULT 'suggested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guide_sessions_context_v26
  ON guide_sessions_v26(country_iso3, city_id, status, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_guide_messages_session_v26
  ON guide_messages_v26(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_guide_events_session_v26
  ON guide_context_events_v26(session_id, occurred_at DESC);
