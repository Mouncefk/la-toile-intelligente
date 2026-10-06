# V29.19 — Spatial Climate Grid & Interpolation

V29.19 introduces a reusable global spatial climate layer.

## Acceleration strategy

Instead of querying climate data independently for every territory, the platform creates a global grid and lets territories reference one or more cells. Climate observations can then be ingested once per grid cell and reused by many territories.

## Layers

1. **Grid** — global PostGIS cells.
2. **Observations** — monthly climate values per cell.
3. **Territory links** — weighted relationship between graph territories and cells.
4. **Territory monthly view** — weighted climate signal ready for tourism intelligence.

## Hemisphere invariant

Every cell carries an explicit hemisphere state:
- north
- south
- equatorial
- cross_equatorial

Season interpretation remains delegated to the V29.16 hemisphere-aware reference model.

## Acceleration

The first grid is 5° and can be generated directly in PostGIS. A finer grid can be introduced later without changing the observation or territory-link contracts.

This makes the climate layer reusable for the globe, destinations, travel seasons, tourism forms, professional matching and future vibrations.
