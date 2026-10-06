-- V29.18 — Global Climate Coverage
-- Builds ingestion targets from canonical graph territories and executes spatially explicit coverage.
CREATE TABLE IF NOT EXISTS climate_ingestion_targets_v29_18 (
  id BIGSERIAL PRIMARY KEY,
  node_id BIGINT NOT NULL REFERENCES graph_nodes_v29_12(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('country','admin1','place','territory')),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  hemisphere TEXT NOT NULL CHECK (hemisphere IN ('north','south','equatorial')),
  priority SMALLINT NOT NULL DEFAULT 50,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  source_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(node_id)
);
CREATE INDEX IF NOT EXISTS idx_climate_targets_active_v29_18 ON climate_ingestion_targets_v29_18(active,priority);
CREATE INDEX IF NOT EXISTS idx_climate_targets_geo_v29_18 ON climate_ingestion_targets_v29_18(latitude,longitude);

CREATE TABLE IF NOT EXISTS climate_coverage_runs_v29_18 (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES climate_sources_v29_17(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running','success','partial','failed')),
  target_count INTEGER NOT NULL DEFAULT 0,
  completed_targets INTEGER NOT NULL DEFAULT 0,
  failed_targets INTEGER NOT NULL DEFAULT 0,
  ingested_rows INTEGER NOT NULL DEFAULT 0,
  error_sample JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE OR REPLACE FUNCTION refresh_climate_targets_v29_18()
RETURNS TABLE(inserted_or_updated BIGINT)
LANGUAGE plpgsql AS $$
DECLARE n BIGINT;
BEGIN
  INSERT INTO climate_ingestion_targets_v29_18
    (node_id,target_type,latitude,longitude,hemisphere,priority,source_ref,metadata)
  SELECT g.id,'country',
         ST_Y(ST_PointOnSurface(s.geom)),
         ST_X(ST_PointOnSurface(s.geom)),
         CASE WHEN ST_Y(ST_PointOnSurface(s.geom)) > 0.1 THEN 'north'
              WHEN ST_Y(ST_PointOnSurface(s.geom)) < -0.1 THEN 'south'
              ELSE 'equatorial' END,
         10,s.source_fid::text,jsonb_build_object('dataset','ne_10m_admin_0_countries','name',s.name)
  FROM ne_admin0_countries_v29_14 s
  JOIN graph_nodes_v29_12 g ON g.node_type='country'
   AND g.external_key=COALESCE(NULLIF(UPPER(s.iso_a3),'-'),NULLIF(UPPER(s.adm0_a3),'-'))
  WHERE s.geom IS NOT NULL
  ON CONFLICT(node_id) DO UPDATE SET
    latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,hemisphere=EXCLUDED.hemisphere,
    source_ref=EXCLUDED.source_ref,metadata=EXCLUDED.metadata,active=TRUE;
  GET DIAGNOSTICS n=ROW_COUNT;
  RETURN QUERY SELECT n;
END $$;

CREATE OR REPLACE VIEW climate_global_coverage_v29_18 AS
SELECT t.node_id,t.target_type,t.latitude,t.longitude,t.hemisphere,t.priority,
       o.year,o.month,o.temperature_c,o.precipitation_mm,o.humidity_pct,o.wind_ms,
       o.solar_kwh_m2_day
FROM climate_ingestion_targets_v29_18 t
LEFT JOIN climate_observations_v29_17 o
  ON o.latitude=t.latitude AND o.longitude=t.longitude;
