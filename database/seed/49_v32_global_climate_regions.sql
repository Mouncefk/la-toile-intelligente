-- V32.9 — global climate regions
CREATE TABLE IF NOT EXISTS v32_climate_regions (
 climate_key TEXT PRIMARY KEY,
 name_fr TEXT NOT NULL,
 climate_family TEXT NOT NULL,
 hemisphere_scope TEXT NOT NULL CHECK(hemisphere_scope IN ('north','south','both','equatorial')),
 latitude_min NUMERIC(6,2),
 latitude_max NUMERIC(6,2),
 tourism_context TEXT[] NOT NULL DEFAULT '{}',
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
INSERT INTO v32_climate_regions(climate_key,name_fr,climate_family,hemisphere_scope,latitude_min,latitude_max,tourism_context) VALUES
('equatorial','Équatorial','tropical','equatorial',-5,5,ARRAY['nature','ecotourisme']),
('tropical','Tropical','tropical','both',-23.5,23.5,ARRAY['nature','balneaire']),
('arid','Aride / désertique','dry','both',-35,35,ARRAY['desert','aventure']),
('mediterranean','Méditerranéen','temperate','both',30,45,ARRAY['balneaire','culture','artisanat','gastronomie']),
('oceanic','Océanique','temperate','both',35,60,ARRAY['culture','nature','family']),
('continental','Continental','temperate','both',35,70,ARRAY['culture','nature','montagne']),
('mountain','Montagnard','alpine','both',25,70,ARRAY['montagne','nature','aventure']),
('polar','Polaire','polar','both',60,90,ARRAY['aventure','nature'])
ON CONFLICT(climate_key) DO UPDATE SET name_fr=EXCLUDED.name_fr,climate_family=EXCLUDED.climate_family,hemisphere_scope=EXCLUDED.hemisphere_scope,latitude_min=EXCLUDED.latitude_min,latitude_max=EXCLUDED.latitude_max,tourism_context=EXCLUDED.tourism_context;
