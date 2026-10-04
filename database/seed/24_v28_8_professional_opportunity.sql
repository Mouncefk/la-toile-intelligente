CREATE TABLE IF NOT EXISTS ai_recommendation_opportunities_v28_8 (
  id BIGSERIAL PRIMARY KEY,
  recommendation_id BIGINT NOT NULL REFERENCES ai_recommendations_v21(id) ON DELETE CASCADE,
  traveler_id BIGINT NOT NULL,
  request_id BIGINT,
  service_needs JSONB NOT NULL DEFAULT '[]'::jsonb,
  location JSONB NOT NULL DEFAULT '{}'::jsonb,
  scope TEXT NOT NULL DEFAULT 'local',
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recommendation_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_opportunities_traveler_v28_8
  ON ai_recommendation_opportunities_v28_8(traveler_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_opportunities_request_v28_8
  ON ai_recommendation_opportunities_v28_8(request_id);