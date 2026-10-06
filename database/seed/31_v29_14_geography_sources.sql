-- V29.14 — Natural Earth 10m integration contracts
-- Raw source tables are intentionally separate from canonical graph nodes.
CREATE TABLE IF NOT EXISTS graph_geography_sources_v29_14 (
  id BIGSERIAL PRIMARY KEY,
  source_name TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  dataset_version TEXT,
  source_url TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  license_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(source_name, dataset_name, dataset_version)
);

CREATE TABLE IF NOT EXISTS graph_territory_links_v29_14 (
  id BIGSERIAL PRIMARY KEY,
  graph_node_id BIGINT NOT NULL REFERENCES graph_nodes_v29_12(id) ON DELETE CASCADE,
  source_dataset TEXT NOT NULL,
  source_fid TEXT NOT NULL,
  source_iso3 TEXT,
  relation_type TEXT NOT NULL DEFAULT 'geometry_source',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(graph_node_id, source_dataset, source_fid)
);

CREATE INDEX IF NOT EXISTS idx_graph_territory_links_source
  ON graph_territory_links_v29_14(source_dataset, source_fid);
CREATE INDEX IF NOT EXISTS idx_graph_territory_links_iso3
  ON graph_territory_links_v29_14(source_iso3);

INSERT INTO graph_geography_sources_v29_14
(source_name,dataset_name,dataset_version,source_url,license_note)
VALUES
('Natural Earth','Admin 0 Countries','5.1.1','https://www.naturalearthdata.com/downloads/10m-cultural-vectors/','Free vector and raster map data; verify current Natural Earth terms before redistribution.'),
('Natural Earth','Admin 1 States Provinces','5.1.1','https://www.naturalearthdata.com/downloads/10m-cultural-vectors/','Free vector and raster map data; verify current Natural Earth terms before redistribution.'),
('Natural Earth','Populated Places','5.1.2','https://www.naturalearthdata.com/downloads/10m-cultural-vectors/','Free vector and raster map data; verify current Natural Earth terms before redistribution.')
ON CONFLICT DO NOTHING;
