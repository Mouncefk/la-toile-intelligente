-- V29.10 — Official web presence requirements
CREATE TABLE IF NOT EXISTS professional_web_presence_v29_10 (
  id BIGSERIAL PRIMARY KEY,
  professional_id BIGINT NOT NULL UNIQUE,
  website_url TEXT,
  requirement_level TEXT NOT NULL DEFAULT 'recommended'
    CHECK (requirement_level IN ('required','recommended','optional')),
  status TEXT NOT NULL DEFAULT 'missing'
    CHECK (status IN ('missing','declared','verified','invalid')),
  verification JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prof_web_presence_requirement
  ON professional_web_presence_v29_10(requirement_level,status);

CREATE INDEX IF NOT EXISTS idx_prof_web_presence_professional
  ON professional_web_presence_v29_10(professional_id);
