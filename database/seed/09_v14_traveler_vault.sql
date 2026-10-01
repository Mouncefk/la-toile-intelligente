CREATE TABLE IF NOT EXISTS traveler_profiles_v14 (
  traveler_id BIGINT PRIMARY KEY,
  display_name TEXT,
  preferred_language TEXT,
  home_country_iso3 CHAR(3),
  privacy_level TEXT NOT NULL DEFAULT 'private',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traveler_vault_items_v14 (
  id BIGSERIAL PRIMARY KEY,
  traveler_id BIGINT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('trip','request','response','reservation','document','memory')),
  title TEXT NOT NULL,
  summary TEXT,
  country_iso3 CHAR(3),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traveler_health_v14 (
  traveler_id BIGINT PRIMARY KEY,
  allergies TEXT,
  blood_type TEXT,
  important_treatments TEXT,
  emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  reference_doctor TEXT,
  reference_facility TEXT,
  notes TEXT,
  share_in_emergency BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_items_traveler ON traveler_vault_items_v14(traveler_id, item_type, updated_at DESC);

CREATE OR REPLACE VIEW traveler_vault_v14 AS
SELECT traveler_id,
       jsonb_agg(jsonb_build_object('id',id,'type',item_type,'title',title,'summary',summary,'country',country_iso3,'metadata',metadata,'private',is_private,'createdAt',created_at,'updatedAt',updated_at) ORDER BY updated_at DESC) AS items
FROM traveler_vault_items_v14
GROUP BY traveler_id;
