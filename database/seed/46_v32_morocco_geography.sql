-- V32.6 — Morocco geographic descent
INSERT INTO v32_geo_nodes(node_key,node_type,name,parent_key,country_iso3,hemisphere,climate_keys,latitude,longitude,metadata)
VALUES
('mar-rabat','territory','Rabat','country-mar','MAR','north',ARRAY['mediterranean'],34.0209,-6.8416,'{"legacy_territory_key":"RABAT","pilot":true}'::jsonb),
('mar-marrakech','territory','Marrakech','country-mar','MAR','north',ARRAY['arid'],31.6295,-7.9811,'{"legacy_territory_key":"MARRAKECH","pilot":true}'::jsonb),
('mar-merzouga','territory','Merzouga','country-mar','MAR','north',ARRAY['arid'],31.0801,-4.0134,'{"legacy_territory_key":"MERZOUGA","pilot":true}'::jsonb),
('mar-ouarzazate','territory','Ouarzazate','country-mar','MAR','north',ARRAY['arid','mountain'],30.9335,-6.9370,'{"legacy_territory_key":"OUARZAZATE"}'::jsonb),
('mar-agadir','territory','Agadir','country-mar','MAR','north',ARRAY['mediterranean'],30.4278,-9.5981,'{"legacy_territory_key":"AGADIR"}'::jsonb),
('mar-essaouira','territory','Essaouira','country-mar','MAR','north',ARRAY['mediterranean'],31.5085,-9.7595,'{"legacy_territory_key":"ESSAOUIRA"}'::jsonb),
('mar-ifrane','territory','Ifrane','country-mar','MAR','north',ARRAY['mountain'],33.5228,-5.1100,'{"legacy_territory_key":"IFRANE"}'::jsonb),
('mar-casablanca','territory','Casablanca','country-mar','MAR','north',ARRAY['mediterranean'],33.5731,-7.5898,'{"legacy_territory_key":"CASABLANCA"}'::jsonb),
('mar-tanger','territory','Tanger','country-mar','MAR','north',ARRAY['mediterranean'],35.7595,-5.8340,'{"legacy_territory_key":"TANGER"}'::jsonb)
ON CONFLICT(node_key) DO UPDATE SET parent_key=EXCLUDED.parent_key,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,climate_keys=EXCLUDED.climate_keys,metadata=EXCLUDED.metadata;
