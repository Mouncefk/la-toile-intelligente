-- La Toile V11 — Matching Engine
CREATE TABLE IF NOT EXISTS professional_availability_v11 (
  id BIGSERIAL PRIMARY KEY,
  professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  available_from DATE,
  available_to DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS professional_services_v11 (
  id BIGSERIAL PRIMARY KEY,
  professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(professional_id, service_key)
);

CREATE TABLE IF NOT EXISTS traveler_match_results_v11 (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT,
  professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  distance_km NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prof_services_key ON professional_services_v11(service_key);
CREATE INDEX IF NOT EXISTS idx_prof_availability_dates ON professional_availability_v11(available_from,available_to);

CREATE OR REPLACE FUNCTION match_professionals_v11(
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 100,
  p_service_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  professional_id BIGINT,
  distance_km DOUBLE PRECISION,
  service_label TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT p.id,
    ST_Distance(
      p.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lon,p_lat),4326)::geography
    ) / 1000.0 AS distance_km,
    COALESCE(ps.label,'') AS service_label
  FROM professionals p
  LEFT JOIN professional_services_v11 ps ON ps.professional_id=p.id
  WHERE p.geom IS NOT NULL
    AND ST_DWithin(
      p.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lon,p_lat),4326)::geography,
      p_radius_km*1000
    )
    AND (p_service_key IS NULL OR ps.service_key=p_service_key)
  ORDER BY distance_km ASC;
$$;
