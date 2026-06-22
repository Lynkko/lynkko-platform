-- Migration: 0004_wompi_integration.sql
-- Adds Wompi payment integration and billing cycle management

-- Table: Billing cycles (subscription billing dates)
CREATE TABLE IF NOT EXISTS billing_cycles (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  cycle_start TIMESTAMPTZ NOT NULL,
  cycle_end TIMESTAMPTZ NOT NULL,
  next_invoice_date TIMESTAMPTZ NOT NULL,
  invoice_id TEXT REFERENCES invoices(id),
  invoice_generated_at TIMESTAMPTZ,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, overdue
  payment_attempts INTEGER NOT NULL DEFAULT 0,
  max_payment_attempts INTEGER NOT NULL DEFAULT 3,
  last_payment_attempt_at TIMESTAMPTZ,
  last_payment_error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS billing_cycle_subscription_idx ON billing_cycles(subscription_id);
CREATE INDEX IF NOT EXISTS billing_cycle_tenant_idx ON billing_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS billing_cycle_next_invoice_idx ON billing_cycles(next_invoice_date) WHERE payment_status = 'pending';

-- Table: Wompi transactions (payment history)
CREATE TABLE IF NOT EXISTS wompi_transactions (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  amount INTEGER NOT NULL, -- in lowest currency unit (pesos, cents, etc)
  currency TEXT NOT NULL DEFAULT 'COP',
  reference TEXT NOT NULL UNIQUE, -- Wompi reference
  status TEXT NOT NULL, -- APPROVED, PENDING, DECLINED, ERROR
  payment_method JSONB, -- { type: 'CARD', brand: 'VISA', last_four: '1234' }
  wompi_response JSONB, -- Full Wompi API response
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wompi_invoice_idx ON wompi_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS wompi_tenant_idx ON wompi_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS wompi_status_idx ON wompi_transactions(status);
CREATE INDEX IF NOT EXISTS wompi_reference_idx ON wompi_transactions(reference);

-- Table: Payment methods (customer saved cards, etc)
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL, -- card, bank_account, etc
  brand TEXT, -- VISA, MASTERCARD, etc
  last_four TEXT,
  token TEXT UNIQUE, -- Wompi tokenized payment method
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_method_tenant_idx ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS payment_method_default_idx ON payment_methods(tenant_id, is_default);

-- Table: Failed payment recovery (retry queue)
CREATE TABLE IF NOT EXISTS failed_payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  billing_cycle_id TEXT REFERENCES billing_cycles(id) ON DELETE SET NULL,
  tenant_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP',
  reason TEXT NOT NULL, -- declined, network_error, expired_card, etc
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ, -- When payment succeeded or marked as write-off
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS failed_payment_tenant_idx ON failed_payments(tenant_id);
CREATE INDEX IF NOT EXISTS failed_payment_retry_idx ON failed_payments(next_retry_at) WHERE resolved_at IS NULL;
