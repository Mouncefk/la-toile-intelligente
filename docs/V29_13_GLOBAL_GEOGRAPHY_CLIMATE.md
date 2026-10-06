# V29.13 — Global Geography & Climate Foundation

## Purpose
Define the global geographic/climate layer consumed by the Living Tourism Graph.

## Source strategy
Natural Earth 10m is the cartographic baseline for country/admin-1 geometry. Its official 10m cultural vectors provide 258 country/cartographic units, over 4,500 admin-1 divisions, populated places and time zones. Natural Earth also distinguishes de facto country boundaries from optional POV/de jure variants. This makes it suitable as a geometric/cartographic base, but it is not itself the final tourism/climate knowledge source.

Reference: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/

## Core geographic dimensions
Every territory node can carry:
- hemisphere: north / south / equatorial-crossing
- continent
- macro-region
- country / ISO3
- administrative hierarchy
- tourism territory / destination
- coordinates / geometry
- timezone

A country is not equivalent to a tourism destination. Tourism territories may cross administrative boundaries.

## Climate dimensions
Climate must be modeled independently from administrative geography:
- climate_region
- climate_classification
- local_climate
- microclimate
- altitude
- seasonality
- temperature profile
- precipitation profile
- relevant natural conditions

The system must support multiple climate zones inside one country and microclimates inside a tourism territory.

## Hemisphere rule
Month is not a universal season.

The reasoning chain is:
date → hemisphere → local season → climate region → local conditions → tourism compatibility.

Equatorial/cross-equatorial territories require local climate/season evidence rather than a simplistic North/South seasonal label.

## Data separation
Keep separate:
1. geometry/cartography;
2. administrative identity;
3. tourism geography;
4. climate knowledge;
5. weather/current conditions;
6. tourism compatibility.

Do not hardcode a single climate classification as immutable truth.

## Initial graph relations
- territory located_in hemisphere
- territory located_in continent
- territory belongs_to country
- territory has_climate
- territory belongs_to_climate_region
- territory has_timezone
- experience compatible_with_climate
- experience available_during
- activity affected_by_conditions

## Required temporal fields
Climate and tourism compatibility records must support:
- observed_at
- recorded_at
- valid_from
- valid_to
- confidence
- evidence

Current weather belongs to the dynamic signal/vibration layer, not the static climate layer.

## Global architecture
GLOBE
→ HEMISPHERE
→ CONTINENT / MACRO-REGION
→ COUNTRY
→ ADMINISTRATIVE TERRITORY
→ TOURISM TERRITORY
→ DESTINATION / CITY / ZONE
→ POI

Cross-cutting:
CLIMATE REGION
→ LOCAL CLIMATE
→ SEASON
→ CONDITIONS
→ TOURISM COMPATIBILITY

## Product rule
The globe, country, climate, hemisphere and time layers must remain global-core capabilities. Morocco is a pilot territory, not a special architecture.

## Next step
Load/normalize real geographic source data into PostGIS, then add a governed climate-region dataset and explicit evidence/provenance before activating climate-driven recommendations.
