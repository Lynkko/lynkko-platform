-- lynkko-audit: DB propia del servicio
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  user_id     TEXT,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id TEXT,
  meta        JSONB,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_tenant_idx   ON audit_logs (tenant_id);
CREATE INDEX IF NOT EXISTS audit_user_idx     ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_action_idx   ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_resource_idx ON audit_logs (resource, resource_id);
CREATE INDEX IF NOT EXISTS audit_created_idx  ON audit_logs (created_at);
