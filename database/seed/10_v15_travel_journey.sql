-- La Toile V15 — Reservations & Journey Tracking
CREATE TABLE IF NOT EXISTS traveler_trips_v15 (
  id BIGSERIAL PRIMARY KEY,
  traveler_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  country_iso3 CHAR(3),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','upcoming','ongoing','completed','cancelled')),
  start_date DATE,
  end_date DATE,
  timezone TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_segments_v15 (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES traveler_trips_v15(id) ON DELETE CASCADE,
  segment_type TEXT NOT NULL CHECK (segment_type IN ('transport','accommodation','activity','health','security','meal','other')),
  title TEXT NOT NULL,
  location TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','reserved','confirmed','completed','cancelled')),
  reference_code TEXT,
  provider_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traveler_reservations_v15 (
  id BIGSERIAL PRIMARY KEY,
  traveler_id BIGINT NOT NULL,
  trip_id BIGINT REFERENCES traveler_trips_v15(id) ON DELETE SET NULL,
  segment_id BIGINT REFERENCES trip_segments_v15(id) ON DELETE SET NULL,
  professional_id BIGINT,
  reservation_type TEXT NOT NULL,
  provider_name TEXT,
  confirmation_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','modified','cancelled','completed')),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  amount NUMERIC(12,2),
  currency_code CHAR(3),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_events_v15 (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES traveler_trips_v15(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_traveler_status ON traveler_trips_v15(traveler_id,status,start_date);
CREATE INDEX IF NOT EXISTS idx_segments_trip_time ON trip_segments_v15(trip_id,start_at);
CREATE INDEX IF NOT EXISTS idx_reservations_traveler_status ON traveler_reservations_v15(traveler_id,status,start_at);
CREATE INDEX IF NOT EXISTS idx_trip_events_trip_time ON trip_events_v15(trip_id,event_at);

CREATE OR REPLACE VIEW traveler_journey_v15 AS
SELECT t.id AS trip_id,t.traveler_id,t.title,t.country_iso3,t.status,t.start_date,t.end_date,
       COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.start_at) FROM trip_segments_v15 s WHERE s.trip_id=t.id),'[]'::jsonb) AS segments,
       COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.start_at) FROM traveler_reservations_v15 r WHERE r.trip_id=t.id),'[]'::jsonb) AS reservations,
       COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.event_at) FROM trip_events_v15 e WHERE e.trip_id=t.id),'[]'::jsonb) AS events
FROM traveler_trips_v15 t;
