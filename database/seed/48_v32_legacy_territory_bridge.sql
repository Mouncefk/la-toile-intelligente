-- V32.8 — legacy territory bridge
CREATE TABLE IF NOT EXISTS v32_territory_bridge (
 legacy_system TEXT NOT NULL,
 legacy_key TEXT NOT NULL,
 globe_node_key TEXT NOT NULL REFERENCES v32_geo_nodes(node_key) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(legacy_system,legacy_key)
);
INSERT INTO v32_territory_bridge(legacy_system,legacy_key,globe_node_key)
SELECT 'v30',metadata->>'legacy_territory_key',node_key FROM v32_geo_nodes
WHERE metadata ? 'legacy_territory_key'
ON CONFLICT(legacy_system,legacy_key) DO UPDATE SET globe_node_key=EXCLUDED.globe_node_key;
CREATE INDEX IF NOT EXISTS idx_v32_bridge_node ON v32_territory_bridge(globe_node_key);
