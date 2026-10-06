-- V29 — controlled traveler/professional handoff
CREATE TABLE IF NOT EXISTS traveler_professional_handoffs_v29 (
  id BIGSERIAL PRIMARY KEY,
  recommendation_id BIGINT NOT NULL REFERENCES ai_recommendations_v21(id) ON DELETE CASCADE,
  request_id BIGINT NOT NULL,
  traveler_id BIGINT NOT NULL,
  professional_id BIGINT,
  identity_revealed BOOLEAN NOT NULL DEFAULT false,
  shared_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_handoffs_traveler_v29 ON traveler_professional_handoffs_v29(traveler_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handoffs_professional_v29 ON traveler_professional_handoffs_v29(professional_id,created_at DESC);
