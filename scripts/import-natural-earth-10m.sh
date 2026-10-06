#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

ROOT="${1:-.data/natural-earth-10m}"
mkdir -p "$ROOT"
cd "$ROOT"

BASE="https://naturalearth.s3.amazonaws.com/10m_cultural"

download_and_import() {
  local zip="$1"
  local table="$2"
  local url="$BASE/$zip"
  echo "Downloading $url"
  curl -fsSL "$url" -o "$zip"
  unzip -oq "$zip"
  local shp
  shp=$(find . -maxdepth 1 -name '*.shp' -print -quit)
  test -n "$shp"
  echo "Importing $shp into $table"
  ogr2ogr -f PostgreSQL "$DATABASE_URL" "$shp"     -nln "public.$table"     -nlt PROMOTE_TO_MULTI     -lco GEOMETRY_NAME=geom     -lco FID=source_fid     -overwrite
  rm -f "$zip" ./*.shp ./*.shx ./*.dbf ./*.prj ./*.cpg ./*.qix ./*.sbn ./*.sbx
}

download_and_import "ne_10m_admin_0_countries.zip" "ne_admin0_countries_v29_14"
download_and_import "ne_10m_admin_1_states_provinces.zip" "ne_admin1_states_v29_14"
download_and_import "ne_10m_populated_places.zip" "ne_populated_places_v29_14"

echo "Natural Earth 10m import completed."
