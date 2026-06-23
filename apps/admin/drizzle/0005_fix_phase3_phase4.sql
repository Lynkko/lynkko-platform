-- Migration: 0005_fix_phase3_phase4.sql
-- Crea las tablas de fases 3-4 que fallaron por conflicto de nombres.
-- platform_api_keys (renombrada de api_keys para evitar conflicto con apps).

CREATE TABLE IF NOT EXISTS platform_api_keys (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  key_hash             TEXT NOT NULL UNIQUE,
  app_id               TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  tenant_id            TEXT,
  permissions          JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  rate_limit_per_minute INTEGER DEFAULT 60,
  last_used_at         TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_api_key_app_idx    ON platform_api_keys(app_id);
CREATE INDEX IF NOT EXISTS platform_api_key_tenant_idx ON platform_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS platform_api_key_active_idx ON platform_api_keys(is_active);

-- Webhook delivery tracking

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id            TEXT PRIMARY KEY,
  event_type    TEXT NOT NULL,
  tenant_id     TEXT NOT NULL,
  app_id        TEXT NOT NULL,
  payload       JSONB NOT NULL,
  webhook_url   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  http_status   INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_delivery_status_idx ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS webhook_delivery_app_idx    ON webhook_deliveries(app_id);
CREATE INDEX IF NOT EXISTS webhook_delivery_tenant_idx ON webhook_deliveries(tenant_id);

-- Audit trail (append-only, no UPDATE/DELETE)

CREATE TABLE IF NOT EXISTS audit_logs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT NOT NULL,
  action        TEXT NOT NULL,
  changes       JSONB,
  metadata      JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  status        TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_user_idx     ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_resource_idx ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_action_idx   ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_created_idx  ON audit_logs(created_at);

-- Rate limit records

CREATE TABLE IF NOT EXISTS rate_limit_records (
  id            TEXT PRIMARY KEY,
  api_key_id    TEXT NOT NULL REFERENCES platform_api_keys(id) ON DELETE CASCADE,
  window_start  TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limit_key_window_idx ON rate_limit_records(api_key_id, window_start);

-- Billing cycles

CREATE TABLE IF NOT EXISTS billing_cycles (
  id                    TEXT PRIMARY KEY,
  subscription_id       TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  tenant_id             TEXT NOT NULL,
  app_id                TEXT NOT NULL,
  cycle_start           TIMESTAMPTZ NOT NULL,
  cycle_end             TIMESTAMPTZ NOT NULL,
  next_invoice_date     TIMESTAMPTZ NOT NULL,
  invoice_id            TEXT REFERENCES invoices(id),
  invoice_generated_at  TIMESTAMPTZ,
  payment_status        TEXT NOT NULL DEFAULT 'pending',
  payment_attempts      INTEGER NOT NULL DEFAULT 0,
  max_payment_attempts  INTEGER NOT NULL DEFAULT 3,
  last_payment_attempt_at TIMESTAMPTZ,
  last_payment_error    TEXT,
  metadata              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS billing_cycle_subscription_idx  ON billing_cycles(subscription_id);
CREATE INDEX IF NOT EXISTS billing_cycle_tenant_idx        ON billing_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS billing_cycle_next_invoice_idx  ON billing_cycles(next_invoice_date) WHERE payment_status = 'pending';

-- Wompi transactions

CREATE TABLE IF NOT EXISTS wompi_transactions (
  id              TEXT PRIMARY KEY,
  invoice_id      TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  tenant_id       TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'COP',
  reference       TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL,
  payment_method  JSONB,
  wompi_response  JSONB,
  error_message   TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wompi_invoice_idx   ON wompi_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS wompi_tenant_idx    ON wompi_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS wompi_status_idx    ON wompi_transactions(status);
CREATE INDEX IF NOT EXISTS wompi_reference_idx ON wompi_transactions(reference);

-- Payment methods

CREATE TABLE IF NOT EXISTS payment_methods (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL,
  type       TEXT NOT NULL,
  brand      TEXT,
  last_four  TEXT,
  token      TEXT UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_method_tenant_idx   ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS payment_method_default_idx  ON payment_methods(tenant_id, is_default);

-- Failed payments

CREATE TABLE IF NOT EXISTS failed_payments (
  id               TEXT PRIMARY KEY,
  invoice_id       TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  billing_cycle_id TEXT REFERENCES billing_cycles(id) ON DELETE SET NULL,
  tenant_id        TEXT NOT NULL,
  amount           INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'COP',
  reason           TEXT NOT NULL,
  attempt_count    INTEGER NOT NULL DEFAULT 0,
  max_attempts     INTEGER NOT NULL DEFAULT 5,
  next_retry_at    TIMESTAMPTZ,
  last_retry_at    TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS failed_payment_tenant_idx ON failed_payments(tenant_id);
CREATE INDEX IF NOT EXISTS failed_payment_retry_idx  ON failed_payments(next_retry_at) WHERE resolved_at IS NULL;
