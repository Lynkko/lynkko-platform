-- WS-5 · Revenue/billing en platform
-- 5.1 per-app vs consolidada: app_id null = factura consolidada (multi-app).
-- 5.3 gancho a lynkko-facturación (DIAN, diferido): referencia + estado legal.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS app_id           TEXT REFERENCES platform_apps(id),
  ADD COLUMN IF NOT EXISTS legal_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS legal_status     TEXT;

CREATE INDEX IF NOT EXISTS invoice_app_idx ON invoices (app_id);
