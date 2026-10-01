CREATE TABLE IF NOT EXISTS traveler_requests_v12 (
  id BIGSERIAL PRIMARY KEY,
  traveler_id BIGINT,
  country_id BIGINT REFERENCES countries(id) ON DELETE SET NULL,
  raw_text TEXT NOT NULL,
  intent JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_dispatches_v12 (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES traveler_requests_v12(id) ON DELETE CASCADE,
  professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  match_score NUMERIC(5,2),
  distance_km NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, professional_id)
);

CREATE TABLE IF NOT EXISTS professional_responses_v12 (
  id BIGSERIAL PRIMARY KEY,
  dispatch_id BIGINT NOT NULL REFERENCES request_dispatches_v12(id) ON DELETE CASCADE,
  professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  message TEXT,
  availability_status TEXT NOT NULL DEFAULT 'received',
  proposed_start TIMESTAMPTZ,
  proposed_end TIMESTAMPTZ,
  price_amount NUMERIC(14,2),
  currency_code CHAR(3),
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS response_comparisons_v12 (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES traveler_requests_v12(id) ON DELETE CASCADE,
  traveler_id BIGINT,
  selected_response_id BIGINT REFERENCES professional_responses_v12(id) ON DELETE SET NULL,
  compared_response_ids BIGINT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_request ON request_dispatches_v12(request_id);
CREATE INDEX IF NOT EXISTS idx_response_dispatch ON professional_responses_v12(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_response_request ON professional_responses_v12(dispatch_id);

CREATE OR REPLACE FUNCTION dispatch_request_v12(p_request_id BIGINT, p_radius_km NUMERIC DEFAULT 100)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE n INTEGER;
BEGIN
  INSERT INTO request_dispatches_v12(request_id, professional_id, match_score, distance_km)
  SELECT p_request_id, m.professional_id, m.match_score, m.distance_km
  FROM traveler_match_results_v11 m
  WHERE m.request_id = p_request_id
  ON CONFLICT (request_id, professional_id) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
