-- Migration: 0003_api_keys_audit.sql
-- Adds API key management and audit trail for Phase 3

-- Table: API Keys for app-to-platform authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  app_id TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  tenant_id TEXT,
  permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  rate_limit_per_minute INTEGER DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_key_app_idx ON api_keys(app_id);
CREATE INDEX IF NOT EXISTS api_key_tenant_idx ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS api_key_active_idx ON api_keys(is_active);

-- Table: Webhook delivery tracking
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  webhook_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, delivered, failed, archived
  http_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_delivery_status_idx ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS webhook_delivery_app_idx ON webhook_deliveries(app_id);
CREATE INDEX IF NOT EXISTS webhook_delivery_tenant_idx ON webhook_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS webhook_delivery_retry_idx ON webhook_deliveries(next_retry_at) WHERE status = 'failed';

-- Table: Audit trail for all admin operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'plan', 'subscription', 'invoice', 'module', 'app', 'tenant'
  resource_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'enable', 'disable', 'cancel'
  changes JSONB, -- { before: {...}, after: {...} }
  metadata JSONB, -- additional context
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failure'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_user_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_resource_idx ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_logs(created_at);

-- Table: Rate limiting (in-memory, but persisted for analytics)
CREATE TABLE IF NOT EXISTS rate_limit_records (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limit_key_window_idx ON rate_limit_records(api_key_id, window_start);
