
-- La Toile V22 — Trust, Verification & Quality Engine
-- Establishes transparent verification states for professionals, offers and public radar sources.

CREATE TABLE IF NOT EXISTS verification_profiles_v22 (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('professional','institution')),
  actor_id BIGINT NOT NULL,
  verification_level TEXT NOT NULL DEFAULT 'unverified',
  status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(actor_type, actor_id)
);

CREATE TABLE IF NOT EXISTS verification_checks_v22 (
  id BIGSERIAL PRIMARY KEY,
  profile_id BIGINT NOT NULL REFERENCES verification_profiles_v22(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  checked_at TIMESTAMPTZ,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_signals_v22 (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id BIGINT NOT NULL,
  signal_type TEXT NOT NULL,
  value NUMERIC,
  explanation TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trust_snapshots_v22 (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id BIGINT NOT NULL,
  verification_level TEXT NOT NULL,
  quality_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_actor_v22
  ON verification_profiles_v22(actor_type, actor_id);

CREATE INDEX IF NOT EXISTS idx_quality_actor_v22
  ON quality_signals_v22(actor_type, actor_id, created_at DESC);
