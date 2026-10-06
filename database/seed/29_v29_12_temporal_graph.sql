-- V29.12 — Temporal Graph Data Model
-- Pragmatic PostgreSQL foundation for the Living Tourism Graph.
-- This schema preserves temporal history and provenance instead of overwriting state.

CREATE TABLE IF NOT EXISTS graph_nodes_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  node_type TEXT NOT NULL,
  external_key TEXT,
  canonical_name TEXT NOT NULL,
  country_iso3 TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  privacy_class TEXT NOT NULL DEFAULT 'public'
    CHECK (privacy_class IN ('public','internal','restricted','sensitive')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(node_type, external_key)
);

CREATE TABLE IF NOT EXISTS graph_node_states_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  node_id BIGINT NOT NULL REFERENCES graph_nodes_v29_12(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  source_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(5,4),
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS graph_relations_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  relation_type TEXT NOT NULL,
  source_node_id BIGINT NOT NULL REFERENCES graph_nodes_v29_12(id) ON DELETE CASCADE,
  target_node_id BIGINT NOT NULL REFERENCES graph_nodes_v29_12(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'directed'
    CHECK (direction IN ('directed','undirected')),
  inferred BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','emerging','weakening','expired','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(relation_type, source_node_id, target_node_id)
);

CREATE TABLE IF NOT EXISTS graph_relation_states_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  relation_id BIGINT NOT NULL REFERENCES graph_relations_v29_12(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  strength NUMERIC(5,4),
  relevance NUMERIC(5,4),
  confidence NUMERIC(5,4),
  intensity NUMERIC(5,4),
  state TEXT NOT NULL DEFAULT 'active',
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (strength IS NULL OR (strength >= 0 AND strength <= 1)),
  CHECK (relevance IS NULL OR (relevance >= 0 AND relevance <= 1)),
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CHECK (intensity IS NULL OR (intensity >= 0 AND intensity <= 1)),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS graph_observations_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('node','relation','vibration')),
  subject_id BIGINT NOT NULL,
  observation_type TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_type TEXT NOT NULL,
  source_ref TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(5,4),
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

CREATE TABLE IF NOT EXISTS graph_evidence_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  observation_id BIGINT REFERENCES graph_observations_v29_12(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_ref TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  reliability NUMERIC(5,4),
  observed_at TIMESTAMPTZ,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','corroborated','verified','rejected')),
  CHECK (reliability IS NULL OR (reliability >= 0 AND reliability <= 1))
);

CREATE TABLE IF NOT EXISTS graph_vibrations_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  vibration_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'detected'
    CHECK (status IN ('detected','qualified','active','propagated','interaction','confirmed','evolving','resolved','emerging','recurring','predictive','expired')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  recurrence JSONB NOT NULL DEFAULT '{}'::jsonb,
  geography JSONB NOT NULL DEFAULT '{}'::jsonb,
  tourism JSONB NOT NULL DEFAULT '{}'::jsonb,
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  relevance NUMERIC(5,4),
  confidence NUMERIC(5,4),
  intensity NUMERIC(5,4),
  novelty NUMERIC(5,4),
  impact NUMERIC(5,4),
  parent_vibration_id BIGINT REFERENCES graph_vibrations_v29_12(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (relevance IS NULL OR (relevance >= 0 AND relevance <= 1)),
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CHECK (intensity IS NULL OR (intensity >= 0 AND intensity <= 1)),
  CHECK (novelty IS NULL OR (novelty >= 0 AND novelty <= 1)),
  CHECK (impact IS NULL OR (impact >= 0 AND impact <= 1)),
  CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at >= starts_at)
);

CREATE TABLE IF NOT EXISTS graph_vibration_events_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  vibration_id BIGINT NOT NULL REFERENCES graph_vibrations_v29_12(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS graph_propagations_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  vibration_id BIGINT NOT NULL REFERENCES graph_vibrations_v29_12(id) ON DELETE CASCADE,
  from_node_id BIGINT REFERENCES graph_nodes_v29_12(id) ON DELETE SET NULL,
  to_node_id BIGINT REFERENCES graph_nodes_v29_12(id) ON DELETE SET NULL,
  relation_id BIGINT REFERENCES graph_relations_v29_12(id) ON DELETE SET NULL,
  propagation_level TEXT NOT NULL
    CHECK (propagation_level IN ('local','territorial','national','cross_border','regional','global')),
  score NUMERIC(8,6),
  relevance NUMERIC(5,4),
  confidence NUMERIC(5,4),
  actionability NUMERIC(5,4),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (score IS NULL OR score >= 0),
  CHECK (relevance IS NULL OR (relevance >= 0 AND relevance <= 1)),
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CHECK (actionability IS NULL OR (actionability >= 0 AND actionability <= 1))
);

CREATE TABLE IF NOT EXISTS graph_actions_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  vibration_id BIGINT REFERENCES graph_vibrations_v29_12(id) ON DELETE SET NULL,
  propagation_id BIGINT REFERENCES graph_propagations_v29_12(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system','traveler','professional','institution','admin')),
  action_type TEXT NOT NULL,
  proposed BOOLEAN NOT NULL DEFAULT false,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS graph_results_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  action_id BIGINT NOT NULL REFERENCES graph_actions_v29_12(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected BOOLEAN,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS graph_snapshots_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  snapshot_type TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  graph_state JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS graph_signals_v29_12 (
  id BIGSERIAL PRIMARY KEY,
  signal_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'emerging'
    CHECK (status IN ('emerging','confirmed','weakening','resolved','false_positive')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence NUMERIC(5,4),
  intensity NUMERIC(5,4),
  acceleration NUMERIC(8,4),
  evidence_count INTEGER NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CHECK (intensity IS NULL OR (intensity >= 0 AND intensity <= 1))
);

CREATE INDEX IF NOT EXISTS idx_graph_node_states_node_time
  ON graph_node_states_v29_12(node_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_relation_states_relation_time
  ON graph_relation_states_v29_12(relation_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_observations_subject_time
  ON graph_observations_v29_12(subject_type, subject_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_vibrations_status_time
  ON graph_vibrations_v29_12(status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_vibration_events_vibration_time
  ON graph_vibration_events_v29_12(vibration_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_propagations_vibration_time
  ON graph_propagations_v29_12(vibration_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_actions_vibration_time
  ON graph_actions_v29_12(vibration_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_snapshots_time
  ON graph_snapshots_v29_12(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_signals_status_time
  ON graph_signals_v29_12(status, last_observed_at DESC);
