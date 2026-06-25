-- Plans: add limits column
ALTER TABLE app_plans ADD COLUMN IF NOT EXISTS limits JSONB;

-- Apps: add show_in_marketplace column
ALTER TABLE platform_apps ADD COLUMN IF NOT EXISTS show_in_marketplace BOOLEAN NOT NULL DEFAULT false;

-- Platform settings (global key-value store)
CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marketplace offerings: which apps appear in each app's marketplace
CREATE TABLE IF NOT EXISTS app_marketplace_offerings (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  host_app_id  TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  guest_app_id TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  is_enabled   BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(host_app_id, guest_app_id)
);

-- Seed default business types
INSERT INTO platform_settings (key, value) VALUES (
  'business_types',
  '[
    {"slug": "banco", "label": "Banco / Financiero"},
    {"slug": "clinica", "label": "Clínica / Salud"},
    {"slug": "gobierno", "label": "Entidad de gobierno"},
    {"slug": "retail", "label": "Tienda / Retail"},
    {"slug": "restaurante", "label": "Restaurante"},
    {"slug": "concesionario", "label": "Concesionario"},
    {"slug": "telecomunicaciones", "label": "Telecomunicaciones"},
    {"slug": "salon_belleza", "label": "Salón de belleza"},
    {"slug": "peluqueria", "label": "Peluquería"},
    {"slug": "barberia", "label": "Barbería"},
    {"slug": "spa", "label": "Spa"},
    {"slug": "salon_unas", "label": "Salón de uñas"},
    {"slug": "estetica", "label": "Estética / Cosmetología"},
    {"slug": "peluqueria_mascotas", "label": "Peluquería de mascotas"},
    {"slug": "bar_gastropub", "label": "Bar / Gastropub"},
    {"slug": "cafeteria", "label": "Cafetería"},
    {"slug": "comidas_rapidas", "label": "Comidas rápidas"},
    {"slug": "tienda_ropa", "label": "Tienda de ropa / Boutique"},
    {"slug": "ferreteria", "label": "Ferretería"},
    {"slug": "drogueria", "label": "Droguería / Farmacia"},
    {"slug": "consultorio_medico", "label": "Consultorio médico"},
    {"slug": "otros", "label": "Otro"}
  ]'::jsonb
) ON CONFLICT (key) DO NOTHING;
