-- V31.2 — reservation requests and lifecycle
CREATE TABLE IF NOT EXISTS v31_reservation_requests (
 id BIGSERIAL PRIMARY KEY,
 traveler_session_id BIGINT NOT NULL REFERENCES v30_traveler_sessions(id) ON DELETE CASCADE,
 offer_id BIGINT NOT NULL REFERENCES v31_pro_offers(id) ON DELETE CASCADE,
 availability_id BIGINT REFERENCES v31_offer_availability(id) ON DELETE SET NULL,
 requested_from TIMESTAMPTZ,
 requested_to TIMESTAMPTZ,
 party_size INT NOT NULL DEFAULT 1 CHECK(party_size>0),
 traveler_note TEXT,
 status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','proposed','confirmed','declined','cancelled','expired')),
 price_amount NUMERIC(12,2),
 currency TEXT,
 professional_note TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v31_reservations_session ON v31_reservation_requests(traveler_session_id,status);
CREATE INDEX IF NOT EXISTS idx_v31_reservations_offer ON v31_reservation_requests(offer_id,status);
