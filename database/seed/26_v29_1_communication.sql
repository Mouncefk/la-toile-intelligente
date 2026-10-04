CREATE TABLE IF NOT EXISTS traveler_professional_threads_v29 (
  id BIGSERIAL PRIMARY KEY,
  recommendation_id BIGINT NOT NULL REFERENCES ai_recommendations_v21(id) ON DELETE CASCADE,
  request_id BIGINT NOT NULL,
  traveler_id BIGINT NOT NULL,
  professional_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recommendation_id, professional_id)
);

CREATE TABLE IF NOT EXISTS traveler_professional_messages_v29 (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES traveler_professional_threads_v29(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('traveler','professional')),
  sender_id BIGINT NOT NULL,
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 5000),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','delivered','read')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tp_threads_traveler_v29
  ON traveler_professional_threads_v29(traveler_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tp_threads_professional_v29
  ON traveler_professional_threads_v29(professional_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tp_messages_thread_v29
  ON traveler_professional_messages_v29(thread_id,created_at ASC);
