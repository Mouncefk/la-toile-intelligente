-- V29.15 — Normalize Natural Earth raw geography into canonical graph nodes.
-- Requires V29.12, V29.13, V29.14 and the raw Natural Earth imports.
-- Raw column names follow the Natural Earth 10m datasets. Keep this layer
-- source-specific; canonical graph IDs remain independent from source IDs.

CREATE TABLE IF NOT EXISTS graph_geography_normalization_runs_v29_15 (
  id BIGSERIAL PRIMARY KEY,
  source_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'started'
    CHECK (status IN ('started','completed','failed')),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS graph_place_links_v29_15 (
  id BIGSERIAL PRIMARY KEY,
  graph_node_id BIGINT NOT NULL REFERENCES graph_nodes_v29_12(id) ON DELETE CASCADE,
  source_dataset TEXT NOT NULL,
  source_fid TEXT NOT NULL,
  place_name TEXT,
  country_iso3 TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_dataset, source_fid)
);

CREATE INDEX IF NOT EXISTS idx_graph_place_links_country
  ON graph_place_links_v29_15(country_iso3);

CREATE OR REPLACE FUNCTION normalize_hemisphere_v29_15(g geometry)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN g IS NULL THEN NULL
    WHEN ST_Intersects(g, ST_SetSRID(ST_GeomFromText('LINESTRING(-180 0,180 0)'),4326))
      THEN 'equatorial_crossing'
    WHEN ST_Y(ST_PointOnSurface(g)) >= 0 THEN 'north'
    ELSE 'south'
  END
$$;

CREATE OR REPLACE FUNCTION normalize_country_nodes_v29_15()
RETURNS TABLE(inserted_count BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE n BIGINT;
BEGIN
  INSERT INTO graph_nodes_v29_12
    (node_type, external_key, canonical_name, country_iso3, metadata, privacy_class)
  SELECT
    'country',
    COALESCE(NULLIF(UPPER(iso_a3),'-'), NULLIF(UPPER(adm0_a3),'-')),
    name,
    COALESCE(NULLIF(UPPER(iso_a3),'-'), NULLIF(UPPER(adm0_a3),'-')),
    jsonb_build_object(
      'source','Natural Earth',
      'source_dataset','ne_10m_admin_0_countries',
      'continent',continent,
      'region_un',region_un,
      'subregion',subregion,
      'source_name',name
    ),
    'public'
  FROM ne_admin0_countries_v29_14
  WHERE COALESCE(NULLIF(UPPER(iso_a3),'-'), NULLIF(UPPER(adm0_a3),'-')) IS NOT NULL
    AND name IS NOT NULL
  ON CONFLICT (node_type, external_key) DO UPDATE
    SET canonical_name=EXCLUDED.canonical_name,
        country_iso3=EXCLUDED.country_iso3,
        metadata=graph_nodes_v29_12.metadata || EXCLUDED.metadata,
        updated_at=now();

  GET DIAGNOSTICS n = ROW_COUNT;

  INSERT INTO graph_territory_context_v29_13
    (node_id,hemisphere,continent,macro_region,country_iso3,geometry_source,geometry_ref)
  SELECT
    g.id,
    normalize_hemisphere_v29_15(s.geom),
    s.continent,
    s.region_un,
    g.country_iso3,
    'Natural Earth 10m',
    s.source_fid::text
  FROM ne_admin0_countries_v29_14 s
  JOIN graph_nodes_v29_12 g
    ON g.node_type='country'
   AND g.external_key=COALESCE(NULLIF(UPPER(s.iso_a3),'-'), NULLIF(UPPER(s.adm0_a3),'-'))
  WHERE s.geom IS NOT NULL
  ON CONFLICT (node_id) DO UPDATE
    SET hemisphere=EXCLUDED.hemisphere,
        continent=EXCLUDED.continent,
        macro_region=EXCLUDED.macro_region,
        country_iso3=EXCLUDED.country_iso3,
        geometry_source=EXCLUDED.geometry_source,
        geometry_ref=EXCLUDED.geometry_ref,
        updated_at=now();

  INSERT INTO graph_territory_links_v29_14
    (graph_node_id,source_dataset,source_fid,source_iso3)
  SELECT g.id,'ne_10m_admin_0_countries',s.source_fid::text,g.country_iso3
  FROM ne_admin0_countries_v29_14 s
  JOIN graph_nodes_v29_12 g
    ON g.node_type='country'
   AND g.external_key=COALESCE(NULLIF(UPPER(s.iso_a3),'-'), NULLIF(UPPER(s.adm0_a3),'-'))
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT n;
END
$$;

CREATE OR REPLACE FUNCTION normalize_admin1_nodes_v29_15()
RETURNS TABLE(inserted_count BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE n BIGINT;
BEGIN
  INSERT INTO graph_nodes_v29_12
    (node_type, external_key, canonical_name, country_iso3, metadata, privacy_class)
  SELECT
    'admin1',
    COALESCE(NULLIF(UPPER(s.gid_1),''), s.source_fid::text),
    s.name,
    NULLIF(UPPER(s.adm0_a3),'-'),
    jsonb_build_object(
      'source','Natural Earth',
      'source_dataset','ne_10m_admin_1_states_v29_14',
      'type',s.type_en,
      'region',s.region
    ),
    'public'
  FROM ne_admin1_states_v29_14 s
  WHERE s.name IS NOT NULL
  ON CONFLICT (node_type, external_key) DO UPDATE
    SET canonical_name=EXCLUDED.canonical_name,
        country_iso3=EXCLUDED.country_iso3,
        metadata=graph_nodes_v29_12.metadata || EXCLUDED.metadata,
        updated_at=now();

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END
$$;

CREATE OR REPLACE FUNCTION normalize_populated_places_v29_15()
RETURNS TABLE(inserted_count BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE n BIGINT;
BEGIN
  INSERT INTO graph_nodes_v29_12
    (node_type, external_key, canonical_name, country_iso3, metadata, privacy_class)
  SELECT
    'place',
    COALESCE(NULLIF(s.gn_id::text,''), s.source_fid::text),
    s.name,
    NULLIF(UPPER(s.adm0_a3),'-'),
    jsonb_build_object(
      'source','Natural Earth',
      'source_dataset','ne_10m_populated_places_v29_14',
      'featurecla',s.featurecla,
      'latitude',s.latitude,
      'longitude',s.longitude
    ),
    'public'
  FROM ne_populated_places_v29_14 s
  WHERE s.name IS NOT NULL
  ON CONFLICT (node_type, external_key) DO UPDATE
    SET canonical_name=EXCLUDED.canonical_name,
        country_iso3=EXCLUDED.country_iso3,
        metadata=graph_nodes_v29_12.metadata || EXCLUDED.metadata,
        updated_at=now();

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END
$$;
