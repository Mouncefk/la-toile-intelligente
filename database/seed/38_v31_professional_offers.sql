-- V31.1 — professional offers and availability
CREATE TABLE IF NOT EXISTS v31_pro_offers (
 id BIGSERIAL PRIMARY KEY,
 professional_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 territory_key TEXT NOT NULL,
 title TEXT NOT NULL,
 description TEXT,
 offer_type TEXT NOT NULL DEFAULT 'experience' CHECK(offer_type IN ('transport','accommodation','experience','health_safety','package','other')),
 specialties TEXT[] NOT NULL DEFAULT '{}',
 audiences TEXT[] NOT NULL DEFAULT '{}',
 inclusions TEXT[] NOT NULL DEFAULT '{}',
 exclusions TEXT[] NOT NULL DEFAULT '{}',
 price_amount NUMERIC(12,2),
 currency TEXT,
 capacity_min INT NOT NULL DEFAULT 1 CHECK(capacity_min>0),
 capacity_max INT CHECK(capacity_max IS NULL OR capacity_max>=capacity_min),
 booking_mode TEXT NOT NULL DEFAULT 'request' CHECK(booking_mode IN ('request','instant','contact')),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','paused','archived')),
 public_contact JSONB NOT NULL DEFAULT '{}'::jsonb,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v31_offers_professional ON v31_pro_offers(professional_id,status);
CREATE INDEX IF NOT EXISTS idx_v31_offers_territory ON v31_pro_offers(territory_key,status);
CREATE INDEX IF NOT EXISTS idx_v31_offers_type ON v31_pro_offers(offer_type,status);

CREATE TABLE IF NOT EXISTS v31_offer_availability (
 id BIGSERIAL PRIMARY KEY,
 offer_id BIGINT NOT NULL REFERENCES v31_pro_offers(id) ON DELETE CASCADE,
 available_from TIMESTAMPTZ NOT NULL,
 available_to TIMESTAMPTZ NOT NULL,
 capacity INT NOT NULL DEFAULT 1 CHECK(capacity>0),
 booked INT NOT NULL DEFAULT 0 CHECK(booked>=0 AND booked<=capacity),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','sold_out','closed')),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(available_to>available_from)
);
CREATE INDEX IF NOT EXISTS idx_v31_availability_offer_window ON v31_offer_availability(offer_id,available_from);
