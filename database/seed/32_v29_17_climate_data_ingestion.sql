-- V29.17 — Climate Data Ingestion
CREATE TABLE IF NOT EXISTS climate_sources_v29_17 (
  id BIGSERIAL PRIMARY KEY, source_code TEXT NOT NULL UNIQUE, provider TEXT NOT NULL,
  dataset TEXT NOT NULL, endpoint TEXT NOT NULL, version TEXT, license_note TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(), metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS climate_observations_v29_17 (
  id BIGSERIAL PRIMARY KEY, source_id BIGINT NOT NULL REFERENCES climate_sources_v29_17(id),
  territory_node_id BIGINT REFERENCES graph_nodes_v29_12(id),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  hemisphere TEXT NOT NULL CHECK (hemisphere IN ('north','south','equatorial')),
  year SMALLINT NOT NULL, month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  temperature_c DOUBLE PRECISION, precipitation_mm DOUBLE PRECISION, humidity_pct DOUBLE PRECISION,
  wind_ms DOUBLE PRECISION, solar_kwh_m2_day DOUBLE PRECISION, raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(source_id, territory_node_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_climate_obs_territory_v29_17 ON climate_observations_v29_17(territory_node_id, year, month);
CREATE TABLE IF NOT EXISTS climate_seasonality_v29_17 (
  id BIGSERIAL PRIMARY KEY, territory_node_id BIGINT NOT NULL REFERENCES graph_nodes_v29_12(id),
  hemisphere TEXT NOT NULL CHECK (hemisphere IN ('north','south','equatorial')),
  season_code TEXT NOT NULL CHECK (season_code IN ('spring','summer','autumn','winter','wet','dry','transition')),
  year SMALLINT NOT NULL, mean_temperature_c DOUBLE PRECISION, precipitation_mm DOUBLE PRECISION,
  climate_signal TEXT, source_id BIGINT REFERENCES climate_sources_v29_17(id),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(territory_node_id, hemisphere, season_code, year)
);
CREATE TABLE IF NOT EXISTS climate_ingestion_runs_v29_17 (
  id BIGSERIAL PRIMARY KEY, source_id BIGINT NOT NULL REFERENCES climate_sources_v29_17(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), finished_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running','success','partial','failed')),
  requested_points INTEGER NOT NULL DEFAULT 0, ingested_rows INTEGER NOT NULL DEFAULT 0,
  failed_points INTEGER NOT NULL DEFAULT 0, error_sample JSONB NOT NULL DEFAULT '[]'::jsonb
);
INSERT INTO climate_sources_v29_17(source_code,provider,dataset,endpoint,version,license_note,metadata)
VALUES ('NASA_POWER_CLIMATOLOGY','NASA POWER','AG climatology / meteorological parameters',
'https://power.larc.nasa.gov/api/temporal/climatology/point','API v2.0',
'NASA POWER data are provided by NASA; preserve source attribution downstream.',
'{"parameters":["T2M","PRECTOTCORR","RH2M","WS2M","ALLSKY_SFC_SW_DWN"],"community":"AG"}'::jsonb)
ON CONFLICT(source_code) DO UPDATE SET endpoint=EXCLUDED.endpoint,version=EXCLUDED.version,metadata=EXCLUDED.metadata;
CREATE OR REPLACE FUNCTION hemisphere_from_latitude_v29_17(lat DOUBLE PRECISION) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
SELECT CASE WHEN lat > 0.1 THEN 'north' WHEN lat < -0.1 THEN 'south' ELSE 'equatorial' END; $$;
CREATE OR REPLACE FUNCTION season_from_month_v29_17(month_no INTEGER, hemisphere TEXT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
SELECT CASE
WHEN hemisphere='north' AND month_no IN (3,4,5) THEN 'spring'
WHEN hemisphere='north' AND month_no IN (6,7,8) THEN 'summer'
WHEN hemisphere='north' AND month_no IN (9,10,11) THEN 'autumn'
WHEN hemisphere='north' AND month_no IN (12,1,2) THEN 'winter'
WHEN hemisphere='south' AND month_no IN (9,10,11) THEN 'spring'
WHEN hemisphere='south' AND month_no IN (12,1,2) THEN 'summer'
WHEN hemisphere='south' AND month_no IN (3,4,5) THEN 'autumn'
WHEN hemisphere='south' AND month_no IN (6,7,8) THEN 'winter'
ELSE 'transition' END; $$;
CREATE OR REPLACE VIEW climate_tourism_signals_v29_17 AS
SELECT o.territory_node_id,o.year,o.month,o.hemisphere,o.temperature_c,o.precipitation_mm,
CASE WHEN o.temperature_c IS NULL THEN 'unknown'
WHEN o.temperature_c >= 20 AND COALESCE(o.precipitation_mm,0) < 100 THEN 'sun_favorable'
WHEN o.temperature_c BETWEEN 12 AND 24 THEN 'mild'
WHEN o.temperature_c < 8 THEN 'cold' ELSE 'warm' END AS tourism_climate_signal
FROM climate_observations_v29_17 o;
