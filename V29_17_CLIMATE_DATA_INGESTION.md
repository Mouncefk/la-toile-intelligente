# V29.17 — Climate Data Ingestion

## Objective
Introduce a traceable real-source climate ingestion layer between the global climate reference (V29.16) and the Living Tourism Graph.

## Data flow
NASA POWER climatology → ingestion adapter → PostGIS → monthly observations → hemisphere-aware seasonality → tourism climate signals → future vibrations / Araignée.

## Source
The first production adapter targets NASA POWER climatology point data and records source metadata in `climate_sources_v29_17`.

## PostGIS contract
- `climate_sources_v29_17`: provenance and source registry.
- `climate_observations_v29_17`: monthly raw/normalized climate observations.
- `climate_seasonality_v29_17`: derived seasonal profiles.
- `climate_ingestion_runs_v29_17`: operational ingestion audit.
- `climate_tourism_signals_v29_17`: view exposing climate signals for tourism intelligence.

## Hemisphere rule
Northern and southern hemispheres use opposite meteorological seasons. Equatorial locations are explicitly represented and do not receive an artificial north/south season assignment.

## Runtime
Set `DATABASE_URL`, `LATITUDE`, and `LONGITUDE`, then run:

```bash
node scripts/ingest-v29-17-climate.mjs
```

The adapter is intentionally point-based in V29.17. Territory-wide spatial interpolation and bulk global coverage belong to the next ingestion iterations.

## Verification
```bash
npm run test:v29-17:climate-ingestion
```

## Architectural rule
V29.17 does not overwrite V29.16 climate classes. It adds observed climate data and provenance that can later validate, enrich, or temporally modulate the reference climate layer.
