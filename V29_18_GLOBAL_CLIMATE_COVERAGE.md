# V29.18 — Global Climate Coverage

V29.18 turns V29.17 point ingestion into a territorial coverage pipeline.

## Flow
Natural Earth canonical territories → climate ingestion targets → NASA POWER climatology → PostGIS observations → Living Tourism Graph climate layer.

## Target model
Each canonical country node receives a representative point derived from its PostGIS geometry. The target stores latitude, longitude and the normalized hemisphere.

The target layer is deliberately separate from observations so that later versions can replace representative points with grids, centroids, polygons or raster sampling without changing the graph contract.

## Batch ingestion
`scripts/ingest-v29-18-global-climate.mjs` refreshes targets and processes a bounded batch controlled by `CLIMATE_BATCH_SIZE`.

The ingestion remains traceable to `climate_sources_v29_17` and records operational coverage runs in `climate_coverage_runs_v29_18`.

## Hemisphere
The target inherits north/south/equatorial classification from latitude. V29.16 seasonal semantics remain authoritative.

## Next evolution
V29.19 should add spatial climate interpolation / grid sampling and make seasonality a graph-native temporal signal rather than only a database view.
