-- Migration: 0002_turnflow_plans.sql
-- Adds plans and modules for Turnflow app

-- Insert Turnflow plans (actualizado: Fase 1-3 integration)
INSERT INTO app_plans (id, app_id, slug, name, description, monthly_price, annual_price, currency, max_seats, features, is_public, sort_order, is_active)
VALUES
  ('plan_turnflow_basic', 'turnflow', 'basic', 'Basic', 'Para probar Turnflow', 4900000, 3900000, 'COP', 2, '["clientes","citas"]'::jsonb, true, 0, true),
  ('plan_turnflow_pro', 'turnflow', 'pro', 'Pro', 'Para pequeños negocios', 9900000, 7900000, 'COP', 5, '["clientes","citas","pagos","qr_checkin"]'::jsonb, true, 1, true),
  ('plan_turnflow_plus', 'turnflow', 'plus', 'Plus', 'Acceso a todos los módulos', 19900000, 15900000, 'COP', NULL, '["clientes","citas","pagos","qr_checkin","reportes","offline"]'::jsonb, true, 2, true)
ON CONFLICT DO NOTHING;

-- Insert Turnflow modules (actualizado: Fase 1-3 integration)
INSERT INTO platform_modules (app_id, slug, name, description, is_active)
VALUES
  ('turnflow', 'clientes', 'Gestión de Clientes', 'CRM integrado para clientes y contactos', true),
  ('turnflow', 'citas', 'Reserva de Citas', 'Sistema de citas y turnos', true),
  ('turnflow', 'pagos', 'Módulo de Pagos', 'Procesamiento de pagos con Wompi', true),
  ('turnflow', 'qr_checkin', 'Check-in por QR', 'Confirmación de citas/turnos por QR', true),
  ('turnflow', 'reportes', 'Reportes Avanzados', 'Dashboards y análisis detallados', true),
  ('turnflow', 'offline', 'Sincronización Offline', 'Funcionamiento sin conexión', true)
ON CONFLICT DO NOTHING;
