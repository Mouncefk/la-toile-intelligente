-- V28.7 — explicit feedback indexes
CREATE INDEX IF NOT EXISTS idx_ai_feedback_actor_v21
  ON ai_feedback_v21(actor_type,actor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_recommendation_v21
  ON ai_feedback_v21(recommendation_id,created_at DESC);
