-- WS-2.4: registrar los servicios del ecosistema en el catálogo.
-- Ajustar base_url si los dominios cambian. La API key vive en env de platform
-- (NOTIFICATIONS_API_KEY / AUDIT_API_KEY), no en esta tabla.
INSERT INTO platform_services (id, name, base_url, is_active)
VALUES
  ('notifications', 'Lynkko Notifications', 'https://notifications.lynkko.co', true),
  ('audit',         'Lynkko Audit',         'https://audit.lynkko.co',         true)
ON CONFLICT (id) DO UPDATE
  SET base_url = EXCLUDED.base_url,
      name     = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      updated_at = now();
