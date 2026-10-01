
-- La Toile V19 — Notification & Communication Core
-- Central event/notification layer shared by Traveler, Pro, Institution and Radar.

CREATE TABLE IF NOT EXISTS notification_preferences_v19 (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('traveler','professional','institution')),
  actor_id BIGINT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app','email','push')),
  event_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(actor_type, actor_id, channel, event_type)
);

CREATE TABLE IF NOT EXISTS notification_events_v19 (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_type TEXT,
  actor_id BIGINT,
  source_type TEXT,
  source_id BIGINT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications_v19 (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES notification_events_v19(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL,
  actor_id BIGINT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app','email','push')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_actor_v19
  ON notifications_v19(actor_type, actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_type_v19
  ON notification_events_v19(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_deliveries_v19 (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT NOT NULL REFERENCES notifications_v19(id) ON DELETE CASCADE,
  provider TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
