-- V32.4 — pilot country nodes
INSERT INTO v32_geo_nodes(node_key,node_type,name,parent_key,country_iso3,hemisphere,climate_keys,latitude,longitude,metadata)
VALUES
('country-mar','country','Maroc','africa','MAR','north',ARRAY['mediterranean','arid'],31.7917,-7.0926,'{"m49":"504","iso2":"MA","pilot":true}'::jsonb),
('country-fra','country','France','europe','FRA','north',ARRAY['oceanic','mediterranean','mountain'],46.2276,2.2137,'{"m49":"250","iso2":"FR","reference":true}'::jsonb)
ON CONFLICT(node_key) DO UPDATE SET name=EXCLUDED.name,parent_key=EXCLUDED.parent_key,country_iso3=EXCLUDED.country_iso3,hemisphere=EXCLUDED.hemisphere,climate_keys=EXCLUDED.climate_keys,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,metadata=EXCLUDED.metadata;
