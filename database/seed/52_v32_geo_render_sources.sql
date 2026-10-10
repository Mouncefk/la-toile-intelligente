CREATE TABLE IF NOT EXISTS v32_geo_render_sources (
 node_key TEXT PRIMARY KEY REFERENCES v32_geo_nodes(node_key) ON DELETE CASCADE,
 source_dataset TEXT NOT NULL,
 source_key TEXT NOT NULL,
 geometry_type TEXT NOT NULL,
 geometry_ref TEXT,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v32_geo_render_sources_source
 ON v32_geo_render_sources(source_dataset,source_key);