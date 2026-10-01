
-- La Toile V23 — Privacy, Consent & Data Governance Engine
-- Centralizes consent, sharing scopes, audit events and retention policies.
-- Sensitive traveler data, including "Ma santé", is explicitly separated.

CREATE TABLE IF NOT EXISTS privacy_profiles_v23 (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('traveler','professional','institution')),
  actor_id BIGINT NOT NULL,
  privacy_level TEXT NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(actor_type, actor_id)
);

CREATE TABLE IF NOT EXISTS consent_records_v23 (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id BIGINT NOT NULL,
  consent_type TEXT NOT NULL,
  purpose TEXT NOT NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'granted',
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_shares_v23 (
  id BIGSERIAL PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id BIGINT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id BIGINT,
  data_domain TEXT NOT NULL,
  purpose TEXT NOT NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS privacy_audit_events_v23 (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT,
  actor_id BIGINT,
  action TEXT NOT NULL,
  data_domain TEXT NOT NULL,
  object_type TEXT,
  object_id BIGINT,
  result TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retention_policies_v23 (
  id BIGSERIAL PRIMARY KEY,
  data_domain TEXT NOT NULL UNIQUE,
  retention_days INTEGER,
  deletion_mode TEXT NOT NULL DEFAULT 'soft_then_delete',
  legal_basis TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO retention_policies_v23(data_domain, retention_days, deletion_mode, legal_basis)
VALUES
  ('traveler_health', NULL, 'explicit_user_control', 'sensitive_personal_data'),
  ('traveler_vault', NULL, 'explicit_user_control', 'personal_data'),
  ('trip_history', NULL, 'user_controlled', 'service_operation'),
  ('analytics_aggregated', NULL, 'aggregation_only', 'analytics')
ON CONFLICT (data_domain) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_consent_actor_v23
  ON consent_records_v23(actor_type, actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shares_owner_v23
  ON data_shares_v23(owner_type, owner_id, status);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_actor_v23
  ON privacy_audit_events_v23(actor_type, actor_id, occurred_at DESC);
