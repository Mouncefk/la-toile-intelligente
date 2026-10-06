-- V29.16 — Global climate reference model
-- Climate classification is kept separate from current weather and tourism semantics.

CREATE TABLE IF NOT EXISTS climate_regions_v29_16 (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  family TEXT NOT NULL,
  description TEXT,
  classification_system TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS climate_classes_v29_16 (
  id BIGSERIAL PRIMARY KEY,
  climate_region_id BIGINT NOT NULL REFERENCES climate_regions_v29_16(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_code TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(climate_region_id, code)
);

CREATE TABLE IF NOT EXISTS graph_climate_assignments_v29_16 (
  id BIGSERIAL PRIMARY KEY,
  node_id BIGINT NOT NULL REFERENCES graph_nodes_v29_12(id) ON DELETE CASCADE,
  climate_class_id BIGINT NOT NULL REFERENCES climate_classes_v29_16(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_ref TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  confidence NUMERIC(5,4),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(node_id, climate_class_id, observed_at),
  CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS climate_season_profiles_v29_16 (
  id BIGSERIAL PRIMARY KEY,
  climate_class_id BIGINT NOT NULL REFERENCES climate_classes_v29_16(id) ON DELETE CASCADE,
  hemisphere TEXT NOT NULL CHECK (hemisphere IN ('north','south','equatorial')),
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  season_label TEXT NOT NULL,
  characteristics JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_type TEXT NOT NULL,
  source_ref TEXT,
  confidence NUMERIC(5,4),
  UNIQUE(climate_class_id, hemisphere, month),
  CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1)
);

CREATE TABLE IF NOT EXISTS tourism_climate_compatibility_v29_16 (
  id BIGSERIAL PRIMARY KEY,
  taxonomy_code TEXT NOT NULL,
  climate_class_id BIGINT NOT NULL REFERENCES climate_classes_v29_16(id) ON DELETE CASCADE,
  hemisphere TEXT NOT NULL CHECK (hemisphere IN ('north','south','equatorial')),
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  compatibility TEXT NOT NULL CHECK (compatibility IN ('favorable','possible','less_adapted','unknown')),
  rationale TEXT,
  confidence NUMERIC(5,4),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(taxonomy_code, climate_class_id, hemisphere, month),
  CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1)
);

CREATE INDEX IF NOT EXISTS idx_climate_assignment_node
  ON graph_climate_assignments_v29_16(node_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_climate_assignment_class
  ON graph_climate_assignments_v29_16(climate_class_id);
CREATE INDEX IF NOT EXISTS idx_climate_season_class_month
  ON climate_season_profiles_v29_16(climate_class_id, hemisphere, month);
CREATE INDEX IF NOT EXISTS idx_tourism_climate_taxonomy
  ON tourism_climate_compatibility_v29_16(taxonomy_code, hemisphere, month);

INSERT INTO climate_regions_v29_16(code,name,family,description,classification_system)
VALUES
('TROPICAL','Tropical','Tropical','Warm climates with no conventional cold season.','Köppen-Geiger'),
('ARID','Arid / desert','Dry','Dry climates including desert and steppe conditions.','Köppen-Geiger'),
('TEMPERATE','Temperate','Temperate','Temperate climates with varying seasonal regimes.','Köppen-Geiger'),
('CONTINENTAL','Continental','Continental','Strong seasonal contrast, commonly inland/high-latitude.','Köppen-Geiger'),
('POLAR','Polar / subpolar','Polar','Cold high-latitude regimes including tundra and ice conditions.','Köppen-Geiger'),
('MOUNTAIN','Mountain / alpine','Topographic','Topography-driven climates that require elevation-aware treatment.','Derived context')
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name,
  family=EXCLUDED.family,
  description=EXCLUDED.description,
  classification_system=EXCLUDED.classification_system;

-- Representative semantic classes. Detailed raster assignment remains source-driven.
INSERT INTO climate_classes_v29_16(climate_region_id,code,name,description)
SELECT r.id,x.code,x.name,x.description
FROM climate_regions_v29_16 r
JOIN (VALUES
 ('TROPICAL','Af','Tropical rainforest','Köppen-Geiger major class'),
 ('TROPICAL','Am','Tropical monsoon','Köppen-Geiger major class'),
 ('TROPICAL','Aw','Tropical savanna','Köppen-Geiger major class'),
 ('ARID','BWh','Hot desert','Köppen-Geiger class'),
 ('ARID','BWk','Cold desert','Köppen-Geiger class'),
 ('ARID','BSh','Hot semi-arid','Köppen-Geiger class'),
 ('ARID','BSk','Cold semi-arid','Köppen-Geiger class'),
 ('TEMPERATE','Csa','Hot-summer Mediterranean','Köppen-Geiger class'),
 ('TEMPERATE','Csb','Warm-summer Mediterranean','Köppen-Geiger class'),
 ('TEMPERATE','Cfb','Oceanic','Köppen-Geiger class'),
 ('CONTINENTAL','Dfb','Warm-summer humid continental','Köppen-Geiger class'),
 ('CONTINENTAL','Dfc','Subarctic','Köppen-Geiger class'),
 ('POLAR','ET','Tundra','Köppen-Geiger class'),
 ('POLAR','EF','Ice cap','Köppen-Geiger class'),
 ('MOUNTAIN','MOUNTAIN','Mountain / alpine context','Derived elevation-aware class')
) x(region_code,code,name,description) ON r.code=x.region_code
ON CONFLICT (climate_region_id,code) DO UPDATE SET
  name=EXCLUDED.name,
  description=EXCLUDED.description;
