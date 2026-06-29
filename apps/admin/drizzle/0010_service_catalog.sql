-- WS-1: catálogo de servicios del ecosistema (dónde vive cada servicio + su key)
CREATE TABLE IF NOT EXISTS platform_services (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  base_url     TEXT NOT NULL,
  api_key_hash TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  metadata     JSONB,
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_service_active_idx ON platform_services (is_active);
