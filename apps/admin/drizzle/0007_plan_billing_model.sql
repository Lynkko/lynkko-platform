-- Add billing model support to app_plans
-- billing_model: 'flat' (precio fijo mensual/anual) | 'per_seat' (precio por usuario)
-- price_per_seat: precio por usuario por mes (en centavos/unidad de la moneda)

ALTER TABLE app_plans
  ADD COLUMN IF NOT EXISTS billing_model TEXT NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS price_per_seat INTEGER NOT NULL DEFAULT 0;
