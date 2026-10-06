-- V30 schema prerequisites — dependency-ordered table creation
-- Generated from the V30 platform seed. Data and indexes remain in the main V30 seed.

CREATE TABLE IF NOT EXISTS v30_b2b_geo_scopes (
 id BIGSERIAL PRIMARY KEY,
 scope_key TEXT UNIQUE NOT NULL,
 scope_type TEXT NOT NULL CHECK (scope_type IN ('local','regional','national','international','global')),
 name_fr TEXT NOT NULL,
 country_iso3 TEXT,
 region_keys TEXT[] NOT NULL DEFAULT '{}',
 continent_keys TEXT[] NOT NULL DEFAULT '{}',
 description TEXT
);

CREATE TABLE IF NOT EXISTS v30_climate_seasons (
 climate_key TEXT NOT NULL,
 hemisphere TEXT NOT NULL CHECK(hemisphere IN ('north','south','equatorial')),
 month_start INT NOT NULL CHECK(month_start BETWEEN 1 AND 12),
 month_end INT NOT NULL CHECK(month_end BETWEEN 1 AND 12),
 season_fr TEXT NOT NULL,
 tourism_context TEXT[] NOT NULL DEFAULT '{}',
 PRIMARY KEY(climate_key,hemisphere,month_start)
);

CREATE TABLE IF NOT EXISTS v30_emergency_contacts (
 id BIGSERIAL PRIMARY KEY,
 traveler_id BIGINT NOT NULL,
 label TEXT NOT NULL,
 name TEXT NOT NULL,
 phone TEXT,
 relationship TEXT,
 priority INT NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_health_profiles (
 traveler_id BIGINT PRIMARY KEY,
 allergies TEXT[] NOT NULL DEFAULT '{}',
 blood_type TEXT,
 important_treatments TEXT[] NOT NULL DEFAULT '{}',
 emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
 reference_doctor JSONB NOT NULL DEFAULT '{}'::jsonb,
 reference_establishment JSONB NOT NULL DEFAULT '{}'::jsonb,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_institutional_events (
 id BIGSERIAL PRIMARY KEY,
 country_iso3 TEXT,
 territory_key TEXT,
 event_type TEXT NOT NULL,
 tourism_tag TEXT,
 climate_key TEXT,
 month INT,
 aggregate_value NUMERIC,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_pilot_territories (
 country_iso3 TEXT PRIMARY KEY,
 pilot_role TEXT NOT NULL CHECK(pilot_role IN ('primary','secondary','future')),
 name_fr TEXT NOT NULL,
 continent TEXT,
 hemisphere TEXT NOT NULL,
 rationale TEXT,
 active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS v30_territories (
 id BIGSERIAL PRIMARY KEY, country_iso3 TEXT NOT NULL, territory_key TEXT NOT NULL UNIQUE, name_fr TEXT NOT NULL,
 region_type TEXT NOT NULL DEFAULT 'region', latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
 climate_zone TEXT, hemisphere TEXT NOT NULL DEFAULT 'north', tourism_tags TEXT[] NOT NULL DEFAULT '{}',
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb, active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS v30_tourism_climate_rules (
 tourism_tag TEXT NOT NULL,
 climate_key TEXT NOT NULL,
 hemisphere TEXT NOT NULL,
 preferred_months INT[] NOT NULL DEFAULT '{}',
 weight NUMERIC(5,2) NOT NULL DEFAULT 1,
 rationale_fr TEXT NOT NULL,
 PRIMARY KEY(tourism_tag,climate_key,hemisphere)
);

CREATE TABLE IF NOT EXISTS v30_transport_search_links (
 id BIGSERIAL PRIMARY KEY,
 mode TEXT NOT NULL CHECK (mode IN ('air','sea')),
 name_fr TEXT NOT NULL,
 url_template TEXT NOT NULL,
 scope TEXT NOT NULL DEFAULT 'global',
 active BOOLEAN NOT NULL DEFAULT true,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS v30_traveler_sessions (
 id BIGSERIAL PRIMARY KEY, traveler_id BIGINT, country_iso3 TEXT NOT NULL DEFAULT 'MAR',
 territory_key TEXT, stage TEXT NOT NULL DEFAULT 'globe' CHECK(stage IN ('globe','territory','intent','solutions','compare','vault')),
 anonymous BOOLEAN NOT NULL DEFAULT true, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_vault_access_policy (
 item_type TEXT PRIMARY KEY,
 visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility='private'),
 institutional_aggregate BOOLEAN NOT NULL DEFAULT false,
 professional_share_allowed BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS v30_conditions_context (
 territory_key TEXT PRIMARY KEY REFERENCES v30_territories(territory_key) ON DELETE CASCADE,
 observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 temperature_c NUMERIC(5,2),
 precipitation_probability NUMERIC(5,2),
 wind_kmh NUMERIC(6,2),
 condition_code TEXT,
 source TEXT NOT NULL DEFAULT 'pending',
 status TEXT NOT NULL DEFAULT 'not_available' CHECK(status IN ('not_available','available','stale')),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS v30_health_safety_points (
 id BIGSERIAL PRIMARY KEY, territory_key TEXT NOT NULL REFERENCES v30_territories(territory_key) ON DELETE CASCADE,
 service_type TEXT NOT NULL CHECK(service_type IN ('medicine','pharmacy','security','emergency')), name TEXT NOT NULL,
 description TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, public_contact JSONB NOT NULL DEFAULT '{}'::jsonb, active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS v30_pro_profiles (
 id BIGSERIAL PRIMARY KEY,
 country_iso3 TEXT NOT NULL,
 territory_key TEXT REFERENCES v30_territories(territory_key) ON DELETE SET NULL,
 name TEXT NOT NULL,
 pro_type TEXT NOT NULL,
 specialties TEXT[] NOT NULL DEFAULT '{}',
 audiences TEXT[] NOT NULL DEFAULT '{}',
 service_area TEXT[] NOT NULL DEFAULT '{}',
 verified BOOLEAN NOT NULL DEFAULT false,
 active BOOLEAN NOT NULL DEFAULT true,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS v30_solutions (
 id BIGSERIAL PRIMARY KEY, territory_key TEXT NOT NULL REFERENCES v30_territories(territory_key) ON DELETE CASCADE,
 solution_type TEXT NOT NULL CHECK(solution_type IN ('experience','professional','health_safety','mobility','accommodation','culture','artisanat','senior','family')),
 title TEXT NOT NULL, description TEXT, provider_name TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
 specialties TEXT[] NOT NULL DEFAULT '{}', audience TEXT[] NOT NULL DEFAULT '{}', availability TEXT,
 public_contact JSONB NOT NULL DEFAULT '{}'::jsonb, active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS v30_stay_proposal_templates (
 id BIGSERIAL PRIMARY KEY,
 territory_key TEXT NOT NULL REFERENCES v30_territories(territory_key) ON DELETE CASCADE,
 name_fr TEXT NOT NULL,
 proposal_type TEXT NOT NULL DEFAULT 'composed_stay',
 active BOOLEAN NOT NULL DEFAULT true,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS v30_transport_options (
 id BIGSERIAL PRIMARY KEY,
 traveler_id TEXT,
 session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 mode TEXT NOT NULL CHECK (mode IN ('air','sea')),
 source_name TEXT,
 source_url TEXT,
 origin TEXT NOT NULL,
 destination TEXT NOT NULL,
 departure_at TIMESTAMPTZ,
 return_at TIMESTAMPTZ,
 duration_minutes INTEGER,
 price_amount NUMERIC(12,2),
 currency TEXT,
 reference_text TEXT,
 payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','selected','rejected')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_travel_constraints (
 id BIGSERIAL PRIMARY KEY,
 traveler_id TEXT,
 session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 constraint_type TEXT NOT NULL,
 source_type TEXT NOT NULL DEFAULT 'traveler_selected',
 source_id BIGINT,
 value JSONB NOT NULL DEFAULT '{}'::jsonb,
 active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_travel_search_requests (
 id BIGSERIAL PRIMARY KEY,
 traveler_id TEXT,
 session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 search_type TEXT NOT NULL CHECK (search_type IN ('air','sea','air_sea')),
 mode TEXT NOT NULL CHECK (mode IN ('assisted','automatic')),
 origin TEXT,
 destination TEXT,
 departure_at TIMESTAMPTZ,
 return_at TIMESTAMPTZ,
 travelers_count INTEGER,
 constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
 status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','searching','results_ready','completed','cancelled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_traveler_intents (
 id BIGSERIAL PRIMARY KEY, session_id BIGINT NOT NULL REFERENCES v30_traveler_sessions(id) ON DELETE CASCADE,
 raw_text TEXT NOT NULL, intent JSONB NOT NULL DEFAULT '{}'::jsonb, confidence NUMERIC(5,4), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_traveler_profiles (
 session_id BIGINT PRIMARY KEY REFERENCES v30_traveler_sessions(id) ON DELETE CASCADE,
 traveler_type TEXT,
 age_group TEXT,
 mobility_level TEXT,
 party_type TEXT,
 party_size INT,
 children_ages INT[] NOT NULL DEFAULT '{}',
 budget_level TEXT,
 pace TEXT,
 duration_days INT,
 accessibility_needs TEXT[] NOT NULL DEFAULT '{}',
 preferences TEXT[] NOT NULL DEFAULT '{}',
 constraints TEXT[] NOT NULL DEFAULT '{}',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_trip_records (
 id BIGSERIAL PRIMARY KEY,
 traveler_id BIGINT,
 session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 record_type TEXT NOT NULL CHECK(record_type IN ('reservation','document','memory','favorite')),
 title TEXT NOT NULL,
 territory_key TEXT REFERENCES v30_territories(territory_key) ON DELETE SET NULL,
 start_at TIMESTAMPTZ,
 end_at TIMESTAMPTZ,
 status TEXT,
 payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_vault_items (
 id BIGSERIAL PRIMARY KEY, traveler_id BIGINT, session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 item_type TEXT NOT NULL CHECK(item_type IN ('memory','document','reservation','health','emergency','favorite')),
 title TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, privacy_class TEXT NOT NULL DEFAULT 'private' CHECK(privacy_class='private'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_b2b_calls (
 id BIGSERIAL PRIMARY KEY,
 source_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 territory_key TEXT REFERENCES v30_territories(territory_key) ON DELETE SET NULL,
 call_type TEXT NOT NULL CHECK (call_type IN ('tender','interest','partnership','subcontracting','supplier','skills')),
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 requirements TEXT[] NOT NULL DEFAULT '{}',
 specialties TEXT[] NOT NULL DEFAULT '{}',
 audiences TEXT[] NOT NULL DEFAULT '{}',
 target_countries TEXT[] NOT NULL DEFAULT '{}',
 languages TEXT[] NOT NULL DEFAULT '{}',
 budget_level TEXT,
 response_deadline TIMESTAMPTZ,
 status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','closed','awarded')),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_matches (
 id BIGSERIAL PRIMARY KEY, session_id BIGINT NOT NULL REFERENCES v30_traveler_sessions(id) ON DELETE CASCADE,
 solution_id BIGINT NOT NULL REFERENCES v30_solutions(id) ON DELETE CASCADE, score NUMERIC(6,2) NOT NULL,
 reasons JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(session_id,solution_id)
);

CREATE TABLE IF NOT EXISTS v30_pro_collaboration_signals (
 id BIGSERIAL PRIMARY KEY,
 source_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 target_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 signal_type TEXT NOT NULL CHECK (signal_type IN ('awarded','repeat','co_creation','complementarity','territorial')),
 signal_score NUMERIC(8,2) NOT NULL DEFAULT 0,
 evidence_count INTEGER NOT NULL DEFAULT 1,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(source_pro_id,target_pro_id,signal_type)
);

CREATE TABLE IF NOT EXISTS v30_pro_collaboration_summary (
 source_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 target_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 collaboration_score NUMERIC(8,2) NOT NULL DEFAULT 0,
 collaboration_count INTEGER NOT NULL DEFAULT 0,
 last_collaboration_at TIMESTAMPTZ,
 strengths TEXT[] NOT NULL DEFAULT '{}',
 PRIMARY KEY(source_pro_id,target_pro_id)
);

CREATE TABLE IF NOT EXISTS v30_pro_network_links (
 id BIGSERIAL PRIMARY KEY,
 source_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 target_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 relationship TEXT NOT NULL,
 score NUMERIC(6,2) NOT NULL DEFAULT 0,
 reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
 UNIQUE(source_pro_id,target_pro_id,relationship)
);

CREATE TABLE IF NOT EXISTS v30_pro_opportunity_signals (
 id BIGSERIAL PRIMARY KEY,
 territory_key TEXT REFERENCES v30_territories(territory_key) ON DELETE SET NULL,
 source_pro_id BIGINT REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 target_pro_id BIGINT REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 signal_type TEXT NOT NULL CHECK (signal_type IN ('complementary_offer','unserved_need','cross_border','repeat_pattern','emerging_cluster')),
 title TEXT NOT NULL,
 rationale TEXT NOT NULL,
 suggested_action TEXT NOT NULL,
 score NUMERIC(8,2) NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','reviewed','accepted','dismissed')),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_solution_time_constraints (
 id BIGSERIAL PRIMARY KEY,
 solution_id BIGINT NOT NULL REFERENCES v30_solutions(id) ON DELETE CASCADE,
 min_days INTEGER,
 max_days INTEGER,
 lead_time_hours INTEGER NOT NULL DEFAULT 0,
 active BOOLEAN NOT NULL DEFAULT true,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 CHECK (min_days IS NULL OR min_days > 0),
 CHECK (max_days IS NULL OR max_days >= COALESCE(min_days,1)),
 CHECK (lead_time_hours >= 0)
);

CREATE TABLE IF NOT EXISTS v30_travel_search_results (
 id BIGSERIAL PRIMARY KEY,
 request_id BIGINT NOT NULL REFERENCES v30_travel_search_requests(id) ON DELETE CASCADE,
 source_name TEXT NOT NULL,
 source_url TEXT,
 result_type TEXT NOT NULL CHECK (result_type IN ('air','sea')),
 origin TEXT,
 destination TEXT,
 departure_at TIMESTAMPTZ,
 arrival_at TIMESTAMPTZ,
 duration_minutes INTEGER,
 price_amount NUMERIC(12,2),
 currency TEXT,
 carrier TEXT,
 cabin TEXT,
 baggage TEXT,
 external_reference TEXT,
 raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','selected','rejected')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v30_b2b_call_matches (
 id BIGSERIAL PRIMARY KEY,
 call_id BIGINT NOT NULL REFERENCES v30_b2b_calls(id) ON DELETE CASCADE,
 professional_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 score NUMERIC(6,2) NOT NULL DEFAULT 0,
 reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
 notified_at TIMESTAMPTZ,
 status TEXT NOT NULL DEFAULT 'suggested',
 UNIQUE(call_id,professional_id)
);

CREATE TABLE IF NOT EXISTS v30_b2b_responses (
 id BIGSERIAL PRIMARY KEY,
 call_id BIGINT NOT NULL REFERENCES v30_b2b_calls(id) ON DELETE CASCADE,
 responder_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 message TEXT NOT NULL,
 proposal JSONB NOT NULL DEFAULT '{}'::jsonb,
 match_score NUMERIC(6,2),
 status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','shortlisted','accepted','rejected','withdrawn')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(call_id,responder_pro_id)
);

CREATE TABLE IF NOT EXISTS v30_b2b_call_events (
 id BIGSERIAL PRIMARY KEY,
 call_id BIGINT NOT NULL REFERENCES v30_b2b_calls(id) ON DELETE CASCADE,
 actor_pro_id BIGINT REFERENCES v30_pro_profiles(id) ON DELETE SET NULL,
 event_type TEXT NOT NULL CHECK (event_type IN ('published','updated','response_submitted','shortlisted','accepted','rejected','closed')),
 response_id BIGINT REFERENCES v30_b2b_responses(id) ON DELETE SET NULL,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cyclic dependency break: geography and B2B scope roots first.
CREATE TABLE IF NOT EXISTS v30_geography_nodes (
 id BIGSERIAL PRIMARY KEY,
 node_key TEXT NOT NULL UNIQUE,
 parent_key TEXT REFERENCES v30_geography_nodes(node_key) ON DELETE SET NULL,
 node_type TEXT NOT NULL CHECK(node_type IN ('world','hemisphere','continent','country','region','territory')),
 name_fr TEXT NOT NULL,
 country_iso3 TEXT,
 hemisphere TEXT CHECK(hemisphere IN ('north','south','equatorial')),
 climate_zones TEXT[] NOT NULL DEFAULT '{}',
 latitude DOUBLE PRECISION,
 longitude DOUBLE PRECISION,
 active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS v30_b2b_geo_scopes (
 id BIGSERIAL PRIMARY KEY,
 scope_key TEXT UNIQUE NOT NULL,
 scope_type TEXT NOT NULL CHECK (scope_type IN ('local','regional','national','international','global')),
 name_fr TEXT NOT NULL,
 country_iso3 TEXT,
 region_keys TEXT[] NOT NULL DEFAULT '{}',
 continent_keys TEXT[] NOT NULL DEFAULT '{}',
 description TEXT
);

CREATE TABLE IF NOT EXISTS v30_b2b_geo_membership (
 scope_key TEXT NOT NULL REFERENCES v30_b2b_geo_scopes(scope_key) ON DELETE CASCADE,
 node_key TEXT NOT NULL REFERENCES v30_geography_nodes(node_key) ON DELETE CASCADE,
 PRIMARY KEY(scope_key,node_key)
);


CREATE TABLE IF NOT EXISTS v30_graph_events (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  territory_key TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v30_graph_events_territory_created
  ON v30_graph_events(territory_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v30_graph_events_entity_created
  ON v30_graph_events(entity_type, entity_id, created_at DESC);


CREATE TABLE IF NOT EXISTS v30_recalculation_queue (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT,
  solution_id BIGINT,
  territory_key TEXT,
  reason TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_v30_recalc_pending
  ON v30_recalculation_queue(status, priority DESC, created_at);
