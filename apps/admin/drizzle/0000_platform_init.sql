-- ─── Lynkko Platform — migración inicial ────────────────────────────────────
-- Ejecutar en el proyecto Neon dedicado a Lynkko Platform.
-- psql $PLATFORM_DATABASE_URL < drizzle/0000_platform_init.sql

-- ─── Better Auth ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user" (
  "id"             text PRIMARY KEY,
  "name"           text NOT NULL,
  "email"          text NOT NULL UNIQUE,
  "email_verified" boolean NOT NULL DEFAULT false,
  "image"          text,
  "role"           text NOT NULL DEFAULT 'superadmin',
  "created_at"     timestamp NOT NULL DEFAULT now(),
  "updated_at"     timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"           text PRIMARY KEY,
  "expires_at"   timestamp NOT NULL,
  "token"        text NOT NULL UNIQUE,
  "ip_address"   text,
  "user_agent"   text,
  "user_id"      text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at"   timestamp NOT NULL DEFAULT now(),
  "updated_at"   timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "account" (
  "id"                      text PRIMARY KEY,
  "account_id"              text NOT NULL,
  "provider_id"             text NOT NULL,
  "user_id"                 text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "access_token"            text,
  "refresh_token"           text,
  "id_token"                text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope"                   text,
  "password"                text,
  "created_at"              timestamp NOT NULL DEFAULT now(),
  "updated_at"              timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value"      text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ─── @lynkko/platform schema ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "platform_apps" (
  "id"          text PRIMARY KEY,
  "name"        text NOT NULL,
  "description" text,
  "url"         text,
  "is_active"   boolean NOT NULL DEFAULT true,
  "created_at"  timestamp NOT NULL DEFAULT now(),
  "updated_at"  timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "platform_modules" (
  "id"          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "app_id"      text NOT NULL REFERENCES "platform_apps"("id") ON DELETE CASCADE,
  "slug"        text NOT NULL,
  "name"        text NOT NULL,
  "description" text,
  "is_active"   boolean NOT NULL DEFAULT true,
  "created_at"  timestamp NOT NULL DEFAULT now(),
  UNIQUE("app_id", "slug")
);

CREATE TABLE IF NOT EXISTS "tenant_app_access" (
  "id"         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenant_id"  text NOT NULL,
  "app_id"     text NOT NULL REFERENCES "platform_apps"("id") ON DELETE CASCADE,
  "is_enabled" boolean NOT NULL DEFAULT false,
  "theme"      jsonb,
  "config"     jsonb,
  "enabled_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  UNIQUE("tenant_id", "app_id")
);

CREATE INDEX IF NOT EXISTS "tenant_app_tenant_idx" ON "tenant_app_access"("tenant_id");

CREATE TABLE IF NOT EXISTS "tenant_module_access" (
  "id"         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenant_id"  text NOT NULL,
  "app_id"     text NOT NULL,
  "module_id"  text NOT NULL REFERENCES "platform_modules"("id") ON DELETE CASCADE,
  "is_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  UNIQUE("tenant_id", "module_id")
);

CREATE INDEX IF NOT EXISTS "tenant_module_tenant_idx" ON "tenant_module_access"("tenant_id", "app_id");

-- ─── Seed — registro inicial de aplicaciones del ecosistema ──────────────────

INSERT INTO "platform_apps" ("id", "name", "description", "url") VALUES
  ('pec',        'Lynkko App',           'Plataforma de Éxito Comercial',                    'https://app.lynkko.co'),
  ('turnflow',   'Turnflow by Lynkko',   'SaaS de turnos, citas y reservas para negocios',  'https://turnflow.lynkko.co'),
  ('clubpass',   'ClubPass by Lynkko',   'Membresías y fidelización para clientes externos','https://clubpass.lynkko.co'),
  ('incentivos', 'Lynkko Incentivos',    'Gamificación y reconocimiento de equipos internos','https://incentivos.lynkko.co'),
  ('customer',   'Lynkko Customer',      'PQRS y gestión de casos',                          NULL),
  ('help',       'Lynkko Help',          'Centro de ayuda multi-tenant',                     NULL),
  ('facturacion','Lynkko Facturación',   'Facturación electrónica DIAN',                     NULL)
ON CONFLICT ("id") DO NOTHING;
