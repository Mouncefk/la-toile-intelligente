-- V32.5 — globe climate linkage
CREATE TABLE IF NOT EXISTS v32_geo_climate_profiles (
 node_key TEXT PRIMARY KEY REFERENCES v32_geo_nodes(node_key) ON DELETE CASCADE,
 climate_keys TEXT[] NOT NULL DEFAULT '{}',
 hemisphere TEXT NOT NULL CHECK(hemisphere IN ('north','south','equatorial')),
 seasonal_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
 source TEXT NOT NULL DEFAULT 'platform_reference',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO v32_geo_climate_profiles(node_key,climate_keys,hemisphere,seasonal_profile)
SELECT node_key,climate_keys,COALESCE(hemisphere,'equatorial'),
 jsonb_build_object('linked_to','v30_climate_seasons','status','reference')
FROM v32_geo_nodes WHERE node_type IN ('world','continent','country')
ON CONFLICT(node_key) DO UPDATE SET climate_keys=EXCLUDED.climate_keys,hemisphere=EXCLUDED.hemisphere,updated_at=now();
