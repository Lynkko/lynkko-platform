-- Migration: 0001_billing.sql
-- Adds tenants, billing, subscription, and usage tracking tables

CREATE TABLE IF NOT EXISTS tenants (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  country       TEXT,
  timezone      TEXT DEFAULT 'America/Bogota',
  contact_email TEXT,
  contact_phone TEXT,
  logo_url      TEXT,
  status        TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_plans (
  id            TEXT PRIMARY KEY,
  app_id        TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  monthly_price INTEGER NOT NULL DEFAULT 0,
  annual_price  INTEGER NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'COP',
  max_seats     INTEGER,
  features      JSONB,
  is_public     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_plan_app_slug_idx UNIQUE (app_id, slug)
);
CREATE INDEX IF NOT EXISTS app_plan_app_idx ON app_plans(app_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   TEXT PRIMARY KEY,
  tenant_id            TEXT NOT NULL,
  app_id               TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  plan_id              TEXT NOT NULL REFERENCES app_plans(id),
  status               TEXT NOT NULL DEFAULT 'trialing',
  seats                INTEGER NOT NULL DEFAULT 1,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end   TIMESTAMPTZ NOT NULL,
  trial_start          TIMESTAMPTZ,
  trial_end            TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at          TIMESTAMPTZ,
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sub_tenant_app_idx UNIQUE (tenant_id, app_id)
);
CREATE INDEX IF NOT EXISTS sub_tenant_idx ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS sub_status_idx ON subscriptions(status);

CREATE TABLE IF NOT EXISTS invoices (
  id                   TEXT PRIMARY KEY,
  number               TEXT NOT NULL UNIQUE,
  tenant_id            TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft',
  currency             TEXT NOT NULL DEFAULT 'COP',
  subtotal             INTEGER NOT NULL DEFAULT 0,
  tax                  INTEGER NOT NULL DEFAULT 0,
  total                INTEGER NOT NULL DEFAULT 0,
  due_date             TIMESTAMPTZ,
  paid_at              TIMESTAMPTZ,
  period_start         TIMESTAMPTZ,
  period_end           TIMESTAMPTZ,
  wompi_transaction_id TEXT,
  wompi_payment_method JSONB,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS invoice_tenant_idx ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS invoice_status_idx ON invoices(status);

CREATE TABLE IF NOT EXISTS invoice_items (
  id              TEXT PRIMARY KEY,
  invoice_id      TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  app_id          TEXT REFERENCES platform_apps(id),
  subscription_id TEXT REFERENCES subscriptions(id),
  description     TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      INTEGER NOT NULL DEFAULT 0,
  amount          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS invoice_item_invoice_idx ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS usage_records (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL,
  app_id     TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  metric     TEXT NOT NULL,
  value      INTEGER NOT NULL DEFAULT 0,
  period     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usage_tenant_app_metric_period_idx UNIQUE (tenant_id, app_id, metric, period)
);
CREATE INDEX IF NOT EXISTS usage_tenant_idx ON usage_records(tenant_id);
CREATE INDEX IF NOT EXISTS usage_period_idx ON usage_records(period);
