# V29.14 — Global Territory Import

Natural Earth 10m is the first cartographic source for the global geography layer.

The official Natural Earth page currently documents:
- Admin 0 countries: 258 cartographic country units;
- Admin 1 states/provinces: over 4,500 internal divisions;
- populated places;
- version 5.1.1 for Admin 0/Admin 1 and 5.1.2 for populated places.

Source: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/

## Import principle

Raw source geometry is kept separate from canonical Living Tourism Graph nodes.

Flow:

Natural Earth source
→ raw PostGIS layer
→ provenance
→ normalization
→ graph territory node
→ hemisphere / continent / country context
→ climate context
→ tourism territory
→ graph relations.

The importer downloads:
- `ne_10m_admin_0_countries.zip`
- `ne_10m_admin_1_states_provinces.zip`
- `ne_10m_populated_places.zip`

and loads them into PostGIS raw tables.

## Important boundary rule

Natural Earth states that its standard country layer shows de facto boundaries. POV variants exist for several countries. Therefore the source geometry is a cartographic baseline, not a universal political truth. La Toile must preserve source/provenance and allow future governed boundary policies.

## Why raw + canonical layers

We must be able to update the source without destroying:
- canonical IDs;
- tourism territories;
- professional links;
- historical observations;
- vibrations;
- climate knowledge.

A source refresh changes the geometry source layer; it does not recreate the semantic graph.

## Next step

Normalize source geometries into canonical country, administrative region and populated-place nodes, calculate hemisphere/centroid metadata, then connect them to the climate layer and tourism taxonomy.
