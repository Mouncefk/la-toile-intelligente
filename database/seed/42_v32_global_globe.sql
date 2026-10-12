-- V32.1 — global globe navigation model
CREATE TABLE IF NOT EXISTS v32_geo_nodes (
 id BIGSERIAL PRIMARY KEY,
 node_key TEXT UNIQUE NOT NULL,
 node_type TEXT NOT NULL CHECK(node_type IN ('world','continent','country','region','territory','city')),
 parent_key TEXT REFERENCES v32_geo_nodes(node_key) ON DELETE SET NULL,
 name TEXT NOT NULL,
 country_iso3 TEXT,
 hemisphere TEXT CHECK(hemisphere IN ('north','south','equatorial')),
 climate_keys TEXT[] NOT NULL DEFAULT '{}',
 latitude NUMERIC(9,6),
 longitude NUMERIC(9,6),
 bbox JSONB NOT NULL DEFAULT '{}'::jsonb,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_v32_geo_parent ON v32_geo_nodes(parent_key);
CREATE INDEX IF NOT EXISTS idx_v32_geo_country ON v32_geo_nodes(country_iso3);
CREATE INDEX IF NOT EXISTS idx_v32_geo_type ON v32_geo_nodes(node_type);
CREATE TABLE IF NOT EXISTS v32_globe_views (
 id BIGSERIAL PRIMARY KEY,
 traveler_session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 node_key TEXT REFERENCES v32_geo_nodes(node_key) ON DELETE SET NULL,
 zoom_level INT NOT NULL DEFAULT 0 CHECK(zoom_level BETWEEN 0 AND 6),
 center_lat NUMERIC(9,6),
 center_lon NUMERIC(9,6),
 viewport JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
