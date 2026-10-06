-- V29.13 — Global geography / climate metadata
CREATE TABLE IF NOT EXISTS graph_territory_context_v29_13 (
  id BIGSERIAL PRIMARY KEY,
  node_id BIGINT NOT NULL REFERENCES graph_nodes_v29_12(id) ON DELETE CASCADE,
  hemisphere TEXT NOT NULL CHECK (hemisphere IN ('north','south','equatorial_crossing')),
  continent TEXT,
  macro_region TEXT,
  country_iso3 TEXT,
  timezone TEXT,
  geometry_source TEXT,
  geometry_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(node_id)
);

CREATE TABLE IF NOT EXISTS graph_climate_context_v29_13 (
  id BIGSERIAL PRIMARY KEY,
  node_id BIGINT NOT NULL REFERENCES graph_nodes_v29_12(id) ON DELETE CASCADE,
  climate_region TEXT NOT NULL,
  climate_classification TEXT,
  local_climate TEXT,
  microclimate TEXT,
  altitude_m NUMERIC,
  seasonality JSONB NOT NULL DEFAULT '{}'::jsonb,
  temperature_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  precipitation_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  confidence NUMERIC(5,4),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_graph_territory_context_country
  ON graph_territory_context_v29_13(country_iso3);
CREATE INDEX IF NOT EXISTS idx_graph_territory_context_hemisphere
  ON graph_territory_context_v29_13(hemisphere);
CREATE INDEX IF NOT EXISTS idx_graph_climate_context_node_time
  ON graph_climate_context_v29_13(node_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_climate_context_region
  ON graph_climate_context_v29_13(climate_region);
