INSERT INTO v32_geo_render_sources(node_key,source_dataset,source_key,geometry_type,geometry_ref)
SELECT g.node_key,'Natural Earth 10m','country:'||g.country_iso3,'MultiPolygon',g.country_iso3
FROM v32_geo_nodes g
WHERE g.node_type='country' AND g.country_iso3 IS NOT NULL
ON CONFLICT(node_key) DO UPDATE SET source_dataset=EXCLUDED.source_dataset,source_key=EXCLUDED.source_key,geometry_type=EXCLUDED.geometry_type,geometry_ref=EXCLUDED.geometry_ref,updated_at=now();

INSERT INTO v32_geo_render_sources(node_key,source_dataset,source_key,geometry_type,geometry_ref)
SELECT g.node_key,'Natural Earth 10m','admin1:'||COALESCE(g.metadata->>'admin1_code',g.metadata->>'gid_1'),'MultiPolygon',COALESCE(g.metadata->>'admin1_code',g.metadata->>'gid_1')
FROM v32_geo_nodes g
WHERE g.node_type IN ('region','territory')
  AND COALESCE(g.metadata->>'admin1_code',g.metadata->>'gid_1') IS NOT NULL
ON CONFLICT(node_key) DO UPDATE SET source_dataset=EXCLUDED.source_dataset,source_key=EXCLUDED.source_key,geometry_type=EXCLUDED.geometry_type,geometry_ref=EXCLUDED.geometry_ref,updated_at=now();