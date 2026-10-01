
-- La Toile V24 — Identity, Access & Security Core
-- Centralizes roles, sessions, device security, MFA readiness and audit events.

CREATE TABLE IF NOT EXISTS identities_v24 (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('traveler','professional','institution','admin')),
  actor_id BIGINT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_roles_v24 (
  id BIGSERIAL PRIMARY KEY,
  identity_id BIGINT NOT NULL REFERENCES identities_v24(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(identity_id, role_key)
);

CREATE TABLE IF NOT EXISTS auth_sessions_v24 (
  id BIGSERIAL PRIMARY KEY,
  identity_id BIGINT NOT NULL REFERENCES identities_v24(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  device_label TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mfa_methods_v24 (
  id BIGSERIAL PRIMARY KEY,
  identity_id BIGINT NOT NULL REFERENCES identities_v24(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('totp','webauthn','email_otp','sms_otp')),
  status TEXT NOT NULL DEFAULT 'pending',
  label TEXT,
  enrolled_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS security_events_v24 (
  id BIGSERIAL PRIMARY KEY,
  identity_id BIGINT REFERENCES identities_v24(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  result TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_actor_v24
  ON identities_v24(actor_type, actor_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_identity_v24
  ON auth_sessions_v24(identity_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_identity_v24
  ON security_events_v24(identity_id, occurred_at DESC);
