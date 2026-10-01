CREATE TABLE IF NOT EXISTS professional_profiles_v13 (
  professional_id BIGINT PRIMARY KEY REFERENCES professionals(id) ON DELETE CASCADE,
  display_name TEXT,
  headline TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
  service_area_km NUMERIC(10,2) DEFAULT 50,
  accepting_requests BOOLEAN NOT NULL DEFAULT true,
  availability_status TEXT NOT NULL DEFAULT 'available',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS professional_request_actions_v13 (
  id BIGSERIAL PRIMARY KEY,
  dispatch_id BIGINT NOT NULL REFERENCES request_dispatches_v12(id) ON DELETE CASCADE,
  professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('viewed','accepted','declined','withdrawn')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS professional_availability_v13 (
  id BIGSERIAL PRIMARY KEY,
  professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_prof_req_actions_prof ON professional_request_actions_v13(professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prof_availability_prof ON professional_availability_v13(professional_id, start_at);

CREATE OR REPLACE VIEW professional_inbox_v13 AS
SELECT d.id AS dispatch_id, d.request_id, d.professional_id, d.match_score, d.distance_km,
       d.status AS dispatch_status, d.sent_at, r.raw_text, r.intent, r.status AS request_status
FROM request_dispatches_v12 d
JOIN traveler_requests_v12 r ON r.id=d.request_id;
