-- V31.6 — transaction/payment abstraction
CREATE TABLE IF NOT EXISTS v31_transaction_intents (
 id BIGSERIAL PRIMARY KEY,
 reservation_id BIGINT NOT NULL REFERENCES v31_reservation_requests(id) ON DELETE CASCADE,
 amount NUMERIC(12,2) NOT NULL CHECK(amount>=0),
 currency TEXT NOT NULL,
 payment_mode TEXT NOT NULL DEFAULT 'direct' CHECK(payment_mode IN ('direct','escrow','external')),
 provider TEXT,
 provider_reference TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','authorized','paid','held','released','failed','refunded','cancelled')),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v31_transaction_reservation ON v31_transaction_intents(reservation_id);
