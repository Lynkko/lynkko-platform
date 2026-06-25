-- Add contact_name to tenants for tracking the primary contact person (separate from business name)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS contact_name TEXT;
