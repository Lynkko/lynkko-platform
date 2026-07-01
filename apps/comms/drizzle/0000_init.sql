-- lynkko-comms · outbox unificado (email + push)
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  app_id          TEXT NOT NULL,
  channel         TEXT NOT NULL,                    -- 'email' | 'push'
  recipient       TEXT NOT NULL,
  subject         TEXT,
  status          TEXT NOT NULL DEFAULT 'queued',   -- queued|sent|failed|partial
  provider        TEXT,
  provider_id     TEXT,
  error           TEXT,
  idempotency_key TEXT,
  meta            JSONB,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  sent_at         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS messages_tenant_idx  ON messages (tenant_id);
CREATE INDEX IF NOT EXISTS messages_channel_idx ON messages (channel);
CREATE INDEX IF NOT EXISTS messages_status_idx  ON messages (status);
-- Único solo sobre claves no nulas → idempotencia opt-in por request.
CREATE UNIQUE INDEX IF NOT EXISTS messages_idem_idx ON messages (idempotency_key);
