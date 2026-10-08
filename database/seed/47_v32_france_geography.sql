-- V32.7 — France reference geographic descent
INSERT INTO v32_geo_nodes(node_key,node_type,name,parent_key,country_iso3,hemisphere,climate_keys,latitude,longitude,metadata)
VALUES
('fra-paris','territory','Paris','country-fra','FRA','north',ARRAY['oceanic'],48.8566,2.3522,'{"legacy_territory_key":"PARIS","reference":true}'::jsonb),
('fra-nice','territory','Nice','country-fra','FRA','north',ARRAY['mediterranean'],43.7102,7.2620,'{"legacy_territory_key":"NICE","reference":true}'::jsonb),
('fra-alps','territory','Alpes','country-fra','FRA','north',ARRAY['mountain'],45.9237,6.8694,'{"reference":true}'::jsonb),
('fra-brittany','territory','Bretagne','country-fra','FRA','north',ARRAY['oceanic'],48.2020,-2.9326,'{"reference":true}'::jsonb)
ON CONFLICT(node_key) DO UPDATE SET parent_key=EXCLUDED.parent_key,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,climate_keys=EXCLUDED.climate_keys,metadata=EXCLUDED.metadata;
