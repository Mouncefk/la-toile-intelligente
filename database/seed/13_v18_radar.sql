
-- La Toile V18 — Radar Core
-- Public-information opportunities/events/needs, AI qualification and routing.
CREATE TABLE IF NOT EXISTS radar_sources_v18 (
  id BIGSERIAL PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'public_web',
  country_iso3 CHAR(3),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS radar_signals_v18 (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT REFERENCES radar_sources_v18(id) ON DELETE SET NULL,
  country_iso3 CHAR(3),
  region_id BIGINT,
  city_id BIGINT,
  signal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  published_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ai_relevance NUMERIC(5,2),
  ai_confidence NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'new',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS radar_qualifications_v18 (
  id BIGSERIAL PRIMARY KEY,
  signal_id BIGINT NOT NULL REFERENCES radar_signals_v18(id) ON DELETE CASCADE,
  intent JSONB NOT NULL DEFAULT '{}'::jsonb,
  sectors JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  qualified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS radar_dispatches_v18 (
  id BIGSERIAL PRIMARY KEY,
  signal_id BIGINT NOT NULL REFERENCES radar_signals_v18(id) ON DELETE CASCADE,
  professional_id BIGINT,
  institution_id BIGINT,
  match_score NUMERIC(6,2),
  reason JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'suggested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_radar_signals_country_v18
  ON radar_signals_v18(country_iso3);
CREATE INDEX IF NOT EXISTS idx_radar_signals_type_v18
  ON radar_signals_v18(signal_type);
CREATE INDEX IF NOT EXISTS idx_radar_signals_status_v18
  ON radar_signals_v18(status);
