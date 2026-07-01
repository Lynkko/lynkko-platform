-- lynkko-notifications: DB propia del servicio
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT DEFAULT 'info',
  link       TEXT,
  meta       JSONB,
  read_at    TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_tenant_user_idx ON notifications (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS notif_read_idx        ON notifications (read_at);
CREATE INDEX IF NOT EXISTS notif_created_idx      ON notifications (created_at);
