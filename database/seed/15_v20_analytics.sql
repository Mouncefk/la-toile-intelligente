
-- La Toile V20 — Analytics & Data Engine
-- Aggregated analytics layer. No raw traveler health/private vault data is exposed.

CREATE TABLE IF NOT EXISTS analytics_events_v20 (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_type TEXT,
  actor_id BIGINT,
  country_iso3 CHAR(3),
  region_id BIGINT,
  city_id BIGINT,
  session_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS analytics_daily_v20 (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  country_iso3 CHAR(3),
  region_id BIGINT,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(metric_date, country_iso3, region_id, metric_key, dimensions)
);

CREATE TABLE IF NOT EXISTS analytics_insights_v20 (
  id BIGSERIAL PRIMARY KEY,
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  confidence NUMERIC(5,2),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_geo_v20
  ON analytics_events_v20(country_iso3, region_id, city_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_geo_v20
  ON analytics_daily_v20(country_iso3, region_id, metric_date DESC);

CREATE OR REPLACE VIEW institutional_analytics_v20 AS
SELECT
  metric_date,
  country_iso3,
  region_id,
  metric_key,
  metric_value,
  dimensions
FROM analytics_daily_v20;
