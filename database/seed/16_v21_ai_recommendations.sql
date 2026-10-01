
-- La Toile V21 — AI Recommendation & Decision Support Engine
-- The AI assists; the traveler/professional/institution remains the decision maker.

CREATE TABLE IF NOT EXISTS ai_recommendation_sessions_v21 (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('traveler','professional','institution')),
  actor_id BIGINT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_recommendations_v21 (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES ai_recommendation_sessions_v21(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(5,2),
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_url TEXT,
  status TEXT NOT NULL DEFAULT 'presented',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_feedback_v21 (
  id BIGSERIAL PRIMARY KEY,
  recommendation_id BIGINT NOT NULL REFERENCES ai_recommendations_v21(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,
  actor_id BIGINT,
  feedback TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_rec_session_v21
  ON ai_recommendations_v21(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_session_actor_v21
  ON ai_recommendation_sessions_v21(actor_type, actor_id, updated_at DESC);
