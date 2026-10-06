#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGUSER:=connect}"
: "${PGDATABASE:=latOile}"
: "${PGPASSWORD:=connect}"

WORKDIR="${WORKDIR:-/tmp/natural-earth-v29-13}"
BASE="https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural"

rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"

download_unzip() {
  local file="$1"
  local zip="$2"
  curl -fsSL "$BASE/$zip" -o "$WORKDIR/$zip"
  unzip -q "$WORKDIR/$zip" -d "$WORKDIR/$file"
}

download_unzip admin0 ne_10m_admin_0_countries.zip
download_unzip admin1 ne_10m_admin_1_states_provinces.zip
download_unzip places ne_10m_populated_places.zip

export PGPASSWORD

drop_stage() {
  psql -v ON_ERROR_STOP=1 -c "DROP TABLE IF EXISTS $1 CASCADE;"
}

load_shp() {
  local shp="$1"
  local table="$2"
  shp2pgsql -D -s 4326 "$shp" "public.$table" | psql -v ON_ERROR_STOP=1
}

drop_stage ne_admin0_stage_v29_13
drop_stage ne_admin1_stage_v29_13
drop_stage ne_places_stage_v29_13

load_shp "$WORKDIR/admin0/ne_10m_admin_0_countries.shp" ne_admin0_stage_v29_13
load_shp "$WORKDIR/admin1/ne_10m_admin_1_states_provinces.shp" ne_admin1_stage_v29_13
load_shp "$WORKDIR/places/ne_10m_populated_places.shp" ne_places_stage_v29_13

psql -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO graph_nodes_v29_12
  (node_type, external_key, canonical_name, country_iso3, metadata)
SELECT
  'country',
  'natural-earth:country:' || COALESCE(NULLIF(iso_a3,''), adm0_a3),
  name_en,
  NULLIF(iso_a3,''),
  jsonb_build_object(
    'source','Natural Earth',
    'source_version','5.1.1',
    'source_layer','admin_0_countries',
    'continent',continent,
    'region_un',region_un,
    'subregion',subregion,
    'ne_admin0_a3',adm0_a3
  )
FROM ne_admin0_stage_v29_13
WHERE COALESCE(NULLIF(iso_a3,''), NULLIF(adm0_a3,'')) IS NOT NULL
ON CONFLICT (node_type, external_key) DO UPDATE
SET canonical_name=EXCLUDED.canonical_name,
    country_iso3=EXCLUDED.country_iso3,
    metadata=EXCLUDED.metadata,
    updated_at=now();

INSERT INTO graph_territory_context_v29_13
  (node_id,hemisphere,continent,macro_region,country_iso3,geometry_source,geometry_ref)
SELECT
  n.id,
  CASE
    WHEN ST_YMin(ST_Force2D(a.geom)) > 0 THEN 'north'
    WHEN ST_YMax(ST_Force2D(a.geom)) < 0 THEN 'south'
    ELSE 'equatorial_crossing'
  END,
  a.continent,
  a.region_un,
  NULLIF(a.iso_a3,''),
  'Natural Earth 10m',
  COALESCE(NULLIF(a.iso_a3,''),NULLIF(a.adm0_a3,''))
FROM ne_admin0_stage_v29_13 a
JOIN graph_nodes_v29_12 n
  ON n.node_type='country'
 AND n.external_key='natural-earth:country:' || COALESCE(NULLIF(a.iso_a3,''),a.adm0_a3)
ON CONFLICT (node_id) DO UPDATE
SET hemisphere=EXCLUDED.hemisphere,
    continent=EXCLUDED.continent,
    macro_region=EXCLUDED.macro_region,
    country_iso3=EXCLUDED.country_iso3,
    geometry_source=EXCLUDED.geometry_source,
    geometry_ref=EXCLUDED.geometry_ref,
    updated_at=now();

INSERT INTO graph_nodes_v29_12
  (node_type, external_key, canonical_name, country_iso3, metadata)
SELECT
  'admin1',
  'natural-earth:admin1:' || adm1_code,
  name_en,
  adm0_a3,
  jsonb_build_object(
    'source','Natural Earth',
    'source_version','5.1.1',
    'source_layer','admin_1_states_provinces',
    'admin1_code',adm1_code,
    'type',type_en
  )
FROM ne_admin1_stage_v29_13
WHERE NULLIF(adm1_code,'') IS NOT NULL
ON CONFLICT (node_type, external_key) DO UPDATE
SET canonical_name=EXCLUDED.canonical_name,
    country_iso3=EXCLUDED.country_iso3,
    metadata=EXCLUDED.metadata,
    updated_at=now();

INSERT INTO graph_nodes_v29_12
  (node_type, external_key, canonical_name, country_iso3, metadata)
SELECT
  'city',
  'natural-earth:place:' || gid,
  name_en,
  adm0_a3,
  jsonb_build_object(
    'source','Natural Earth',
    'source_version','5.1.2',
    'source_layer','populated_places',
    'featurecla',featurecla,
    'popmax',popmax
  )
FROM ne_places_stage_v29_13
WHERE NULLIF(gid::text,'') IS NOT NULL
  AND NULLIF(name_en,'') IS NOT NULL
ON CONFLICT (node_type, external_key) DO UPDATE
SET canonical_name=EXCLUDED.canonical_name,
    country_iso3=EXCLUDED.country_iso3,
    metadata=EXCLUDED.metadata,
    updated_at=now();

INSERT INTO graph_relations_v29_12
  (relation_type,source_node_id,target_node_id,direction,inferred,status)
SELECT
  'belongs_to',
  a.id,
  c.id,
  'directed',
  false,
  'active'
FROM graph_nodes_v29_12 a
JOIN graph_nodes_v29_12 c
  ON c.node_type='country'
 AND c.country_iso3=a.country_iso3
WHERE a.node_type='admin1'
ON CONFLICT (relation_type,source_node_id,target_node_id) DO NOTHING;
SQL

echo '{"ok":true,"source":"Natural Earth 10m","layers":["admin_0_countries","admin_1_states_provinces","populated_places"]}'
