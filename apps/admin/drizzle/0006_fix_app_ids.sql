-- Fix app IDs: rename 'customer' -> 'pqrs' to match LYNKKO_APPS constant, add 'help'

-- platform_apps.id is the PK and also used as FK in tenant_app_access, subscriptions, etc.
-- Since it's a text PK we need to update all FK references too.
-- tenant_app_access and app_plans use app_id with ON UPDATE CASCADE — but just in case, do it in order.

UPDATE platform_apps
SET id = 'pqrs',
    name = 'Lynkko PQRS',
    description = 'PQRS y gestión de casos de clientes',
    updated_at = NOW()
WHERE id = 'customer';

INSERT INTO platform_apps (id, name, description, url, is_active)
VALUES ('help', 'Lynkko Help', 'Centro de ayuda y soporte', null, true)
ON CONFLICT (id) DO NOTHING;
