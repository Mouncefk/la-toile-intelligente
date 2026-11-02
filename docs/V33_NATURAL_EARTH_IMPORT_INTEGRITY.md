# V33 — Natural Earth import integrity

## Purpose

The V29.14 importer downloads and loads three Natural Earth 10m cultural layers into PostGIS:

- `ne_admin0_countries_v29_14`
- `ne_admin1_states_v29_14`
- `ne_populated_places_v29_14`

A successful shell exit is not sufficient evidence that the globe can render. This validation checks the database after import.

## Prerequisites

- PostgreSQL with PostGIS enabled
- `ogr2ogr`, `curl`, and `unzip`
- `DATABASE_URL` in standard PostgreSQL URL form for the Node.js validator\n- `OGR_CONNECTION` in GDAL PostgreSQL connection-string form for `ogr2ogr`
- The V29.14/V29.15 and V32 geography schema already applied

## Import

Run the existing importer from the repository root:

```bash
export DATABASE_URL='postgresql://connect:...@localhost:5432/latOile'\nexport OGR_CONNECTION='PG:host=localhost port=5432 dbname=latOile user=connect password=...'
bash scripts/import-natural-earth-10m.sh
```

Keep the two connection variables separate: Node's `pg` driver reads `DATABASE_URL`; GDAL/OGR reads `OGR_CONNECTION`. Do not paste a production password into shell history or commit it.

## Validate

After import, run:

```bash
npm run check:geo-import
npm run validate:geo-import
```

The validator requires all three raw layers, the `source_fid` and `geom` columns, non-empty records, valid geometries, SRID 4326, and minimum layer sizes (200 countries/cartographic units, 4,000 admin-1 divisions and 10,000 populated places). It also checks that the canonical V32 geography still contains active country nodes.

The minimum counts are guardrails against incomplete downloads/imports, not a claim that Natural Earth contains an exact number of sovereign states.

## Important separation

Raw Natural Earth tables are source data. They must not replace canonical graph nodes or tourism territories. Re-importing the raw layers must not delete traveler data, professional offers, climate observations, or canonical IDs.

## Release gate still required

This validator is a database integrity gate, not a complete globe acceptance test. Before release, also verify:

1. V29.15 normalization has populated canonical country/admin-1/place nodes and source links.
2. V32 render-source references resolve to actual geometries.
3. The world view renders a recognizable global landmass, not only a decorative sphere.
4. Morocco and France can be navigated from country to their pilot territories.
5. Geometry API responses contain non-empty Polygon/MultiPolygon GeoJSON for both pilot countries.
6. The browser test confirms visible geometry and navigation, not merely the presence of React components.

## Known limitation

The importer uses `ogr2ogr -overwrite` on raw source tables. Run it only against the intended raw import tables. It must not be used as a mechanism to rebuild or replace canonical graph data.
