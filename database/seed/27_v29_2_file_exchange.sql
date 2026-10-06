CREATE TABLE IF NOT EXISTS traveler_professional_files_v29 (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES traveler_professional_threads_v29(id) ON DELETE CASCADE,
  message_id BIGINT REFERENCES traveler_professional_messages_v29(id) ON DELETE SET NULL,
  uploader_type TEXT NOT NULL CHECK (uploader_type IN ('traveler','professional')),
  uploader_id BIGINT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  storage_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','deleted','quarantined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tp_files_thread_v29 ON traveler_professional_files_v29(thread_id,created_at ASC);
CREATE INDEX IF NOT EXISTS idx_tp_files_message_v29 ON traveler_professional_files_v29(message_id);