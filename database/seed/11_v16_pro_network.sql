CREATE TABLE IF NOT EXISTS professional_connections_v16 (
 id BIGSERIAL PRIMARY KEY,
 requester_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
 recipient_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','blocked')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(requester_id,recipient_id),
 CHECK (requester_id <> recipient_id)
);
CREATE TABLE IF NOT EXISTS b2b_threads_v16 (
 id BIGSERIAL PRIMARY KEY,
 created_by BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
 subject TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','archived')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS b2b_thread_members_v16 (
 thread_id BIGINT NOT NULL REFERENCES b2b_threads_v16(id) ON DELETE CASCADE,
 professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
 joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(thread_id,professional_id)
);
CREATE TABLE IF NOT EXISTS b2b_messages_v16 (
 id BIGSERIAL PRIMARY KEY,
 thread_id BIGINT NOT NULL REFERENCES b2b_threads_v16(id) ON DELETE CASCADE,
 sender_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
 body TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS b2b_rfqs_v16 (
 id BIGSERIAL PRIMARY KEY,
 created_by BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 country_iso3 CHAR(3),
 city TEXT,
 needed_from TIMESTAMPTZ,
 needed_to TIMESTAMPTZ,
 status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','awarded','cancelled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS b2b_rfq_recipients_v16 (
 rfq_id BIGINT NOT NULL REFERENCES b2b_rfqs_v16(id) ON DELETE CASCADE,
 professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','viewed','responded','declined')),
 PRIMARY KEY(rfq_id,professional_id)
);
CREATE TABLE IF NOT EXISTS b2b_rfq_responses_v16 (
 id BIGSERIAL PRIMARY KEY,
 rfq_id BIGINT NOT NULL REFERENCES b2b_rfqs_v16(id) ON DELETE CASCADE,
 professional_id BIGINT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
 message TEXT NOT NULL,
 amount NUMERIC(14,2),
 currency_code CHAR(3),
 availability_start TIMESTAMPTZ,
 availability_end TIMESTAMPTZ,
 status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','shortlisted','rejected','accepted')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_b2b_threads_member ON b2b_thread_members_v16(professional_id);
CREATE INDEX IF NOT EXISTS idx_b2b_rfq_creator ON b2b_rfqs_v16(created_by,status);
CREATE INDEX IF NOT EXISTS idx_b2b_rfq_recipient ON b2b_rfq_recipients_v16(professional_id,status);
CREATE INDEX IF NOT EXISTS idx_b2b_messages_thread ON b2b_messages_v16(thread_id,created_at);
