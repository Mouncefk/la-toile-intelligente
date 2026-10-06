-- V29.19 — Spatial Climate Grid & Interpolation
CREATE TABLE IF NOT EXISTS climate_grid_cells_v29_19 (
  id BIGSERIAL PRIMARY KEY,
  grid_level SMALLINT NOT NULL CHECK (grid_level IN (1,2,3)),
  cell_key TEXT NOT NULL,
  geom geometry(POLYGON,4326) NOT NULL,
  centroid geometry(POINT,4326) NOT NULL,
  hemisphere TEXT NOT NULL CHECK (hemisphere IN ('north','south','equatorial','cross_equatorial')),
  UNIQUE(grid_level,cell_key)
);
CREATE INDEX IF NOT EXISTS idx_climate_grid_geom_v29_19 ON climate_grid_cells_v29_19 USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_climate_grid_centroid_v29_19 ON climate_grid_cells_v29_19 USING GIST(centroid);

CREATE TABLE IF NOT EXISTS climate_grid_observations_v29_19 (
  id BIGSERIAL PRIMARY KEY,
  grid_cell_id BIGINT NOT NULL REFERENCES climate_grid_cells_v29_19(id) ON DELETE CASCADE,
  source_id BIGINT NOT NULL REFERENCES climate_sources_v29_17(id),
  year SMALLINT NOT NULL,
  month SMALLINT NOT NULL CHECK(month BETWEEN 1 AND 12),
  temperature_c DOUBLE PRECISION,
  precipitation_mm DOUBLE PRECISION,
  humidity_pct DOUBLE PRECISION,
  wind_ms DOUBLE PRECISION,
  solar_kwh_m2_day DOUBLE PRECISION,
  method TEXT NOT NULL DEFAULT 'direct',
  confidence NUMERIC(5,4),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(grid_cell_id,source_id,year,month),
  CHECK(confidence IS NULL OR confidence BETWEEN 0 AND 1)
);
CREATE INDEX IF NOT EXISTS idx_climate_grid_obs_month_v29_19 ON climate_grid_observations_v29_19(grid_cell_id,year,month);

CREATE TABLE IF NOT EXISTS climate_territory_grid_links_v29_19 (
  id BIGSERIAL PRIMARY KEY,
  node_id BIGINT NOT NULL REFERENCES graph_nodes_v29_12(id) ON DELETE CASCADE,
  grid_cell_id BIGINT NOT NULL REFERENCES climate_grid_cells_v29_19(id) ON DELETE CASCADE,
  weight NUMERIC(8,6) NOT NULL CHECK(weight>=0 AND weight<=1),
  method TEXT NOT NULL CHECK(method IN ('centroid','intersection','nearest','interpolated')),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(node_id,grid_cell_id)
);
CREATE INDEX IF NOT EXISTS idx_climate_territory_grid_node_v29_19 ON climate_territory_grid_links_v29_19(node_id);

CREATE OR REPLACE FUNCTION build_climate_grid_v29_19(p_step DOUBLE PRECISION DEFAULT 5.0)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE lat DOUBLE PRECISION; lon DOUBLE PRECISION; n BIGINT:=0; x1 DOUBLE PRECISION; y1 DOUBLE PRECISION; x2 DOUBLE PRECISION; y2 DOUBLE PRECISION; h TEXT; k TEXT;
BEGIN
 IF p_step <= 0 OR p_step > 20 THEN RAISE EXCEPTION 'grid step must be >0 and <=20 degrees'; END IF;
 lat := -90;
 WHILE lat < 90 LOOP
  lon := -180;
  WHILE lon < 180 LOOP
   x1:=lon; y1:=lat; x2:=LEAST(lon+p_step,180); y2:=LEAST(lat+p_step,90);
   k:=format('%s:%s:%s',p_step,lat,lon);
   h:=CASE WHEN y1>0.1 THEN 'north' WHEN y2 < -0.1 THEN 'south' WHEN y1 < -0.1 AND y2 > 0.1 THEN 'cross_equatorial' ELSE 'equatorial' END;
   INSERT INTO climate_grid_cells_v29_19(grid_level,cell_key,geom,centroid,hemisphere)
   VALUES(CASE WHEN p_step>=5 THEN 1 ELSE 2 END,k,
     ST_SetSRID(ST_MakePolygon(ST_GeomFromText(format('LINESTRING(%s %s,%s %s,%s %s,%s %s,%s %s)',x1,y1,x2,y1,x2,y2,x1,y2,x1,y1))),4326),
     ST_SetSRID(ST_MakePoint((x1+x2)/2,(y1+y2)/2),4326),h)
   ON CONFLICT(grid_level,cell_key) DO NOTHING;
   n:=n+1; lon:=lon+p_step;
  END LOOP;
  lat:=lat+p_step;
 END LOOP;
 RETURN n;
END $$;

CREATE OR REPLACE VIEW climate_territory_monthly_v29_19 AS
SELECT l.node_id,o.year,o.month,
       SUM(o.temperature_c*l.weight) AS temperature_c,
       SUM(o.precipitation_mm*l.weight) AS precipitation_mm,
       SUM(o.humidity_pct*l.weight) AS humidity_pct,
       SUM(o.wind_ms*l.weight) AS wind_ms,
       SUM(o.solar_kwh_m2_day*l.weight) AS solar_kwh_m2_day
FROM climate_territory_grid_links_v29_19 l
JOIN climate_grid_observations_v29_19 o ON o.grid_cell_id=l.grid_cell_id
GROUP BY l.node_id,o.year,o.month;
