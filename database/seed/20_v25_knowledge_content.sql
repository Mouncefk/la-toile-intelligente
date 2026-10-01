
-- La Toile V25 — Tourism Knowledge & Content Engine
-- Structured knowledge layer for destinations, heritage, culture, crafts,
-- gastronomy, experiences and editorial content.

CREATE TABLE IF NOT EXISTS knowledge_entities_v25 (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  country_iso3 CHAR(3),
  region_id BIGINT,
  city_id BIGINT,
  destination_id BIGINT,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'public',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, slug)
);

CREATE TABLE IF NOT EXISTS knowledge_content_v25 (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT NOT NULL REFERENCES knowledge_entities_v25(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  source_type TEXT,
  source_url TEXT,
  source_name TEXT,
  published_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  content_status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(entity_id, language_code)
);

CREATE TABLE IF NOT EXISTS knowledge_taxonomy_v25 (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT NOT NULL REFERENCES knowledge_entities_v25(id) ON DELETE CASCADE,
  taxonomy_key TEXT NOT NULL,
  taxonomy_value TEXT NOT NULL,
  confidence NUMERIC(5,2),
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_relations_v25 (
  id BIGSERIAL PRIMARY KEY,
  from_entity_id BIGINT NOT NULL REFERENCES knowledge_entities_v25(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  to_entity_id BIGINT NOT NULL REFERENCES knowledge_entities_v25(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_entity_id, relation_type, to_entity_id)
);

CREATE TABLE IF NOT EXISTS knowledge_sources_v25 (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT REFERENCES knowledge_entities_v25(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  accessed_at TIMESTAMPTZ,
  reliability_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_knowledge_entity_geo_v25
  ON knowledge_entities_v25(country_iso3, region_id, city_id, destination_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_content_lang_v25
  ON knowledge_content_v25(language_code, content_status);

CREATE INDEX IF NOT EXISTS idx_knowledge_taxonomy_v25
  ON knowledge_taxonomy_v25(taxonomy_key, taxonomy_value);
