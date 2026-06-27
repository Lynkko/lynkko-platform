# Guía de integración — nueva app al ecosistema Lynkko

Referencia práctica para conectar cualquier app (PEC, ClubPass, Incentivos, PQRS, Help, etc.)
con `lynkko-platform`. Sigue los pasos en orden; cada uno depende del anterior.

---

## 0. Antes de empezar — checklist de 2 minutos

| Ítem | Qué verificar |
|------|---------------|
| App ID definido | Existe en `LYNKKO_APPS` en `packages/platform/src/index.ts` |
| App en DB | `SELECT id FROM platform_apps WHERE id = '<tu-app>'` devuelve una fila |
| Paquete instalado | `@lynkko/platform` en `dependencies` de la nueva app |
| `.npmrc` configurado | `@lynkko:registry=https://npm.pkg.github.com` + token en `~/.npmrc` |
| DB separada | La app tiene su propia Neon DB — **nunca compartir con platform** |
| Env vars | `PLATFORM_DATABASE_URL`, `PLATFORM_API_KEY`, `PLATFORM_WEBHOOK_SECRET`, `CRON_SECRET` |

---

## 1. Registrar la app en la plataforma

### 1.1 Verificar que el app ID existe en `LYNKKO_APPS`

```typescript
// packages/platform/src/index.ts
export const LYNKKO_APPS = {
  PEC:        'pec',
  TURNFLOW:   'turnflow',
  CLUBPASS:   'clubpass',
  INCENTIVOS: 'incentivos',
  PQRS:       'pqrs',
  HELP:       'help',
  // ← agregar aquí si es una app nueva
} as const
```

Si la app no está, agregarla en el paquete, hacer `pnpm --filter '@lynkko/platform' build`, publicar nueva versión.

### 1.2 Insertar en la DB de platform

Solo ejecutar **una vez**:

```sql
-- Conectar a: ep-flat-tree-atgxjs64.c-9.us-east-1.aws.neon.tech (platform DB)
INSERT INTO platform_apps (id, name, description, url, is_active)
VALUES (
  'mi-app',                            -- debe coincidir con LYNKKO_APPS
  'Mi App by Lynkko',
  'Descripción corta de la app',
  'https://mi-app.lynkko.co',
  true
)
ON CONFLICT (id) DO NOTHING;
```

**Si esta fila no existe**, cualquier intento de asignar la app a un tenant lanzará:
```
violates foreign key constraint "tenant_app_access_app_id_fkey"
```

### 1.3 Registrar módulos de la app (opcional)

```sql
INSERT INTO platform_modules (id, app_id, slug, name, description, is_active)
VALUES
  (gen_random_uuid(), 'mi-app', 'modulo-basico',   'Módulo básico',   'Descripción', true),
  (gen_random_uuid(), 'mi-app', 'modulo-avanzado', 'Módulo avanzado', 'Descripción', true)
ON CONFLICT DO NOTHING;
```

### 1.4 Crear planes desde el admin

Ir a `lynkko-platform-admin.vercel.app` → **Planes** → Nuevo Plan.

Campos clave:
- **Aplicación**: seleccionar el app ID recién registrado
- **Modelo de cobro**: `flat` (tarifa fija) o `per_seat` (por usuario)
- **Límites** (JSON): `{"max_users": 5, "max_records": 1000}` — los nombres son libres, la app los interpreta

---

## 2. Setup en la nueva app

### 2.1 Instalar el paquete

```bash
pnpm add @lynkko/platform
```

### 2.2 Variables de entorno

```bash
# .env.local
# ── Platform (conexión de solo lectura a DB centralizada) ─────────────────────
PLATFORM_DATABASE_URL="postgresql://neondb_owner:<pass>@ep-flat-tree-atgxjs64.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"

# ── Seguridad ─────────────────────────────────────────────────────────────────
PLATFORM_API_KEY=sk_platform_dev_key_xyz123        # mismo valor que en platform admin
PLATFORM_WEBHOOK_SECRET=wh_secret_dev_key_abc456   # mismo valor que en platform admin
CRON_SECRET=cron_secret_xxx                         # para proteger el endpoint de sync
```

> Las credenciales de producción están en el Vault del proyecto Lynkko.
> **Nunca** reusar `PLATFORM_DATABASE_URL` como `DATABASE_URL` de la app — son DBs distintas.

### 2.3 Cliente de platform (lectura)

```typescript
// src/lib/platform.ts
import { createPlatformClient } from '@lynkko/platform'
import { createDb } from '@lynkko/db'
import { platformSchema } from '@lynkko/platform'

function getPlatformDb() {
  return createDb(platformSchema, process.env.PLATFORM_DATABASE_URL)
}

let _client: ReturnType<typeof createPlatformClient> | null = null

export function getPlatformClient() {
  if (!_client) _client = createPlatformClient(getPlatformDb())
  return _client
}

export const platform = new Proxy({} as ReturnType<typeof createPlatformClient>, {
  get(_t, prop) {
    return (getPlatformClient() as Record<string | symbol, unknown>)[prop]
  },
})
```

### 2.4 Extender la tabla principal del tenant local

Cada app tiene su equivalente a "brand" (en Turnflow es `brands`, en PEC podría ser `organizations`, etc.). Extender esa tabla con la caché de licenciamiento:

```sql
-- Migración: agregar campos de platform a la tabla de tenants local
ALTER TABLE brands   -- o 'organizations', 'accounts', etc.
  ADD COLUMN IF NOT EXISTS platform_tenant_id   TEXT,
  ADD COLUMN IF NOT EXISTS platform_sub_id      TEXT,
  ADD COLUMN IF NOT EXISTS platform_plan_id     TEXT,
  ADD COLUMN IF NOT EXISTS license_status       TEXT NOT NULL DEFAULT 'unknown',
  -- 'valid' | 'grace' | 'expired' | 'unknown'
  ADD COLUMN IF NOT EXISTS license_valid_until  TIMESTAMP,
  ADD COLUMN IF NOT EXISTS active_modules       JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS plan_limits          JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_platform_sync   TIMESTAMP;
```

```typescript
// src/lib/db/schema.ts — agregar en la tabla existente
import { text, timestamp, jsonb } from 'drizzle-orm/pg-core'

// Dentro de tu pgTable de brands/organizations:
platformTenantId:  text('platform_tenant_id'),
platformSubId:     text('platform_sub_id'),
platformPlanId:    text('platform_plan_id'),
licenseStatus:     text('license_status').notNull().default('unknown'),
licenseValidUntil: timestamp('license_valid_until'),
activeModules:     jsonb('active_modules').$type<Record<string, boolean>>().default({}),
planLimits:        jsonb('plan_limits').$type<Record<string, number>>().default({}),
lastPlatformSync:  timestamp('last_platform_sync'),
```

### 2.5 Tabla de eventos de licencia (auditoría local)

```sql
CREATE TABLE IF NOT EXISTS license_events (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  -- 'activated' | 'plan_changed' | 'suspended' | 'cancelled' | 'module_toggled' | 'sync_failed'
  details     JSONB,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);
```

---

## 3. Endpoint de webhook

Platform envía eventos a la app cuando algo cambia. Este endpoint es **obligatorio**.

```typescript
// src/app/api/platform/webhook/route.ts
import { createHmac, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'
import { brands } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ok, unauthorized, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

const WEBHOOK_SECRET = process.env.PLATFORM_WEBHOOK_SECRET!

function verifySignature(body: string, signature: string): boolean {
  const expected = createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-platform-signature') ?? ''

  if (!verifySignature(body, signature)) {
    return unauthorized('Invalid signature')
  }

  let event: any
  try { event = JSON.parse(body) }
  catch { return unauthorized('Invalid JSON') }

  const { event: eventType, brand_id: platformTenantId } = event

  try {
    // Buscar el brand local por platform_tenant_id
    const [brand] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.platformTenantId, platformTenantId))
      .limit(1)

    if (!brand) {
      // El brand aún no existe localmente — es normal en el primer webhook
      return ok({ status: 'ignored', reason: 'brand_not_found' })
    }

    switch (eventType) {
      case 'subscription_activated':
      case 'plan_changed': {
        const { plan, active_modules, period_end } = event
        await db.update(brands).set({
          licenseStatus:     'valid',
          platformSubId:     event.subscription_id,
          platformPlanId:    plan.id,
          licenseValidUntil: new Date(period_end),
          activeModules:     active_modules ?? {},
          planLimits:        plan.limits ?? plan.features ?? {},
          lastPlatformSync:  new Date(),
        }).where(eq(brands.id, brand.id))
        break
      }

      case 'subscription_suspended':
        await db.update(brands).set({
          licenseStatus:    'grace',
          lastPlatformSync: new Date(),
        }).where(eq(brands.id, brand.id))
        break

      case 'subscription_cancelled':
        await db.update(brands).set({
          licenseStatus:    'expired',
          lastPlatformSync: new Date(),
        }).where(eq(brands.id, brand.id))
        break

      case 'module_toggled': {
        const [current] = await db
          .select({ activeModules: brands.activeModules })
          .from(brands)
          .where(eq(brands.id, brand.id))
          .limit(1)

        const updated = { ...(current?.activeModules ?? {}), [event.module_slug]: event.enabled }
        await db.update(brands).set({ activeModules: updated }).where(eq(brands.id, brand.id))
        break
      }
    }

    // Auditoría local
    await db.insert(licenseEvents).values({
      brandId:   brand.id,
      eventType,
      details:   event,
    })

    return ok({ status: 'ok', brand_id: platformTenantId, cached_at: new Date() })
  } catch (err) {
    console.error('[platform/webhook] Error:', err)
    return serverError('Failed to process webhook')
  }
}
```

---

## 4. Helpers de validación local

```typescript
// src/lib/licensing.ts
import { db } from '@/lib/db'
import { brands } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export type LicenseStatus = 'valid' | 'grace' | 'expired' | 'unknown'

export interface LicenseInfo {
  status:    LicenseStatus
  isValid:   boolean          // true si 'valid' o 'grace'
  expiresAt: Date | null
  daysLeft:  number | null
  modules:   Record<string, boolean>
  limits:    Record<string, number>
}

export async function validateLicense(brandId: string): Promise<LicenseInfo> {
  const [brand] = await db
    .select({
      licenseStatus:     brands.licenseStatus,
      licenseValidUntil: brands.licenseValidUntil,
      activeModules:     brands.activeModules,
      planLimits:        brands.planLimits,
    })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1)

  if (!brand) return {
    status: 'unknown', isValid: false,
    expiresAt: null, daysLeft: null, modules: {}, limits: {},
  }

  const status = brand.licenseStatus as LicenseStatus
  const expiresAt = brand.licenseValidUntil
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000))
    : null

  return {
    status,
    isValid:  status === 'valid' || status === 'grace',
    expiresAt,
    daysLeft,
    modules:  (brand.activeModules as Record<string, boolean>) ?? {},
    limits:   (brand.planLimits   as Record<string, number>)  ?? {},
  }
}

export async function isModuleEnabled(brandId: string, moduleSlug: string): Promise<boolean> {
  const license = await validateLicense(brandId)
  return license.isValid && (license.modules[moduleSlug] ?? false)
}

export async function checkLimit(
  brandId: string,
  limitKey: string,
  current: number,
): Promise<{ allowed: boolean; limit: number; percent: number }> {
  const license = await validateLicense(brandId)
  const limit = license.limits[limitKey]

  if (limit === undefined) return { allowed: true, limit: Infinity, percent: 0 }

  return {
    allowed: current < limit,
    limit,
    percent: Math.round((current / limit) * 100),
  }
}
```

---

## 5. Middleware — bloquear acceso sin licencia

```typescript
// src/middleware.ts  (agregar después del check de sesión)
import { validateLicense } from '@/lib/licensing'

// Dentro del middleware, después de verificar la sesión:
const brandId = session.user.brandId
if (brandId) {
  const license = await validateLicense(brandId)
  if (!license.isValid) {
    return NextResponse.redirect(new URL('/app-access-denied', req.url))
  }
}
```

```typescript
// src/app/app-access-denied/page.tsx
export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Acceso no disponible</h1>
      <p className="text-muted-foreground text-center max-w-sm">
        Tu suscripción está inactiva o vencida.
        Contacta a soporte en <a href="mailto:soporte@lynkko.co">soporte@lynkko.co</a>.
      </p>
    </div>
  )
}
```

---

## 6. Cron de sincronización nocturna

Sincroniza el estado de licencias con platform cada noche. Mantiene la caché local fresca
y reporta métricas de uso.

```typescript
// src/app/api/cron/sync-licenses/route.ts
import { db } from '@/lib/db'
import { brands } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { platform } from '@/lib/platform'
import { ok, unauthorized } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

const APP_ID = 'mi-app'  // ← cambiar por el ID de esta app

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return unauthorized('Invalid cron secret')
  }

  const activeBrands = await db
    .select()
    .from(brands)
    .where(eq(brands.licenseStatus, 'valid'))  // o 'grace'

  let synced = 0
  let failed = 0

  for (const brand of activeBrands) {
    if (!brand.platformTenantId) continue

    try {
      const sub = await platform.getSubscription(brand.platformTenantId, APP_ID)

      if (!sub) {
        await db.update(brands).set({
          licenseStatus:    'expired',
          lastPlatformSync: new Date(),
        }).where(eq(brands.id, brand.id))
        continue
      }

      await db.update(brands).set({
        licenseStatus:     sub.status === 'active' ? 'valid' : sub.status === 'trialing' ? 'valid' : 'grace',
        platformPlanId:    sub.planId,
        licenseValidUntil: sub.currentPeriodEnd,
        lastPlatformSync:  new Date(),
      }).where(eq(brands.id, brand.id))

      synced++
    } catch (err) {
      console.error(`[sync-licenses] Error for brand ${brand.id}:`, err)
      failed++
      // No bloquear — continuar con el siguiente brand
    }
  }

  return ok({ synced, failed, total: activeBrands.length })
}
```

**Configurar en Vercel:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-licenses",
      "schedule": "0 3 * * *"
    }
  ]
}
```

Y en el dashboard de Vercel → Settings → Cron Jobs → agregar header
`Authorization: Bearer <CRON_SECRET>`.

---

## 7. Asociar un tenant local con platform

Cuando un usuario se registra por primera vez o cuando el superadmin asigna manualmente:

```typescript
// src/lib/platform-onboarding.ts
import { platform } from '@/lib/platform'
import { db } from '@/lib/db'
import { brands } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function linkBrandToPlatform(
  brandId: string,
  platformTenantId: string,
) {
  // 1. Verificar que el tenant existe en platform
  const tenant = await platform.getTenant(platformTenantId)
  if (!tenant) throw new Error(`Tenant ${platformTenantId} not found in platform`)

  // 2. Obtener suscripción activa
  const sub = await platform.getSubscription(platformTenantId, 'mi-app')

  // 3. Actualizar brand local
  await db.update(brands).set({
    platformTenantId,
    platformSubId:    sub?.id ?? null,
    platformPlanId:   sub?.planId ?? null,
    licenseStatus:    sub ? 'valid' : 'unknown',
    licenseValidUntil: sub?.currentPeriodEnd ?? null,
    lastPlatformSync:  new Date(),
  }).where(eq(brands.id, brandId))
}
```

---

## 8. Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `FK constraint tenant_app_access_app_id_fkey` | La app no existe en `platform_apps` | Ejecutar INSERT en paso 1.2 |
| `License status "unknown"` | Brand nunca fue asociado a platform | Llamar `linkBrandToPlatform()` o asignar desde el admin |
| Webhook recibido pero ignorado | `brand.platformTenantId` es null | Asociar primero el brand con el tenant de platform |
| `PLATFORM_DATABASE_URL` connection error | Usando URL pooled en lugar de unpooled | Verificar que sea `ep-flat-tree-atgxjs64.c-9.us-east-1.aws.neon.tech` (sin `-pooler`) |
| Build falla en Vercel/CI | Build intenta importar `PLATFORM_DATABASE_URL` | Agregar un lazy singleton igual que `src/lib/platform.ts` — no inicializar en module scope |
| `updatePlan` falla con tipo | `description: null` — SDK espera `string \| undefined` | Usar `desc || undefined` en lugar de `desc \| null` |
| App no aparece en la lista de módulos del admin | Módulo no insertado en `platform_modules` | Ejecutar paso 1.3 |

---

## 9. Información de conexión de referencia

| Recurso | Valor |
|---------|-------|
| Platform DB (unpooled) | `ep-flat-tree-atgxjs64.c-9.us-east-1.aws.neon.tech` |
| Platform admin URL | `lynkko-platform-admin.vercel.app` |
| Admin superadmin | `admin@lynkko.co` |
| App IDs válidos | `pec`, `turnflow`, `clubpass`, `incentivos`, `pqrs`, `help` |
| Package registry | `https://npm.pkg.github.com` (`@lynkko` scope) |

---

## 10. Orden de implementación recomendado

```
Día 1 — Infraestructura
  1. Registrar app en platform_apps + módulos + planes (steps 1.1-1.4)
  2. Instalar @lynkko/platform, configurar env vars (steps 2.1-2.2)
  3. Crear src/lib/platform.ts singleton (step 2.3)
  4. Migrar schema local: campos de licencia + tabla license_events (steps 2.4-2.5)

Día 2 — Integración
  5. Implementar POST /api/platform/webhook (step 3)
  6. Crear src/lib/licensing.ts helpers (step 4)
  7. Extender middleware con validación de licencia (step 5)
  8. Crear página /app-access-denied (step 5)

Día 3 — Sincronización
  9. Implementar GET /api/cron/sync-licenses (step 6)
  10. Configurar Vercel Cron (step 6)
  11. Implementar linkBrandToPlatform() (step 7)
  12. Probar flujo completo: activar app en admin → webhook → caché local → middleware
```

---

*Actualizar este documento cuando cambie la API del platform SDK o se agreguen nuevos eventos de webhook.*
