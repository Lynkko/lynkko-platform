# ✅ Phase 1: Complete — Platform Admin, Modules & Marketplace

**Date:** June 21, 2026  
**Status:** Ready for Testing  
**Impact:** All applications can now access centralized marketplace and manage modules

---

## What Was Built

### 1. Core Marketplace API

**GET `/api/marketplace/{tenantId}`**
- Centraliza información de todas las apps, módulos, suscripciones
- Cada app (Turnflow, PEC, etc.) consulta este endpoint para saber qué está disponible
- Respuesta incluye:
  - Apps disponibles y estado de activación
  - Módulos de cada app
  - Estado de activación de cada módulo
  - Información de la suscripción actual (si existe)

### 2. Module Management

**GET `/api/tenants/{tenantId}/modules?app_id={appId}`**
- Obtiene módulos de una app específica
- Incluye estado de activación para el tenant

**POST `/api/tenants/{tenantId}/modules/{moduleId}/toggle`**
- Activa/desactiva un módulo
- Envía webhook automático a la app
- Soporta eventos: `module_enabled`, `module_disabled`

### 3. App Management

**POST `/api/tenants/{tenantId}/apps/{appId}/toggle`**
- Activa/desactiva una app para un tenant
- Envía webhook con info completa (suscripción, módulos, etc)
- Eventos: `app_enabled`, `app_disabled`

### 4. Webhook Integration

**New Webhook Events:**
- `module_enabled` — Módulo activado
- `module_disabled` — Módulo desactivado
- `app_enabled` — App activada
- `app_disabled` — App desactivada

**Features:**
- HMAC-SHA256 signed (verifiable)
- Async delivery (non-blocking)
- Includes all relevant context (module info, subscription data, active modules)

### 5. Dashboard UI

**New Modules Tab** in tenant detail page:
- Shows all modules for each app
- Toggle switches to enable/disable
- Shows module status badges
- Real-time updates via revalidatePath

**Updated Navigation:**
- Added "Módulos" tab to tenant dashboard
- Accessible alongside Apps, Subscriptions, Billing, Usage, Brand

### 6. Server Actions

**New in `/dashboard/tenants/[id]/modules-actions.ts`:**
```typescript
toggleModuleAction(tenantId, moduleId, enabled)
toggleAppAction(tenantId, appId, enabled)
```

---

## File Structure

```
/apps/admin/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── tenants/[tenantId]/
│   │   │   │   ├── modules/route.ts (GET)
│   │   │   │   └── modules/[moduleId]/toggle/route.ts (POST)
│   │   │   │   └── apps/[appId]/toggle/route.ts (POST)
│   │   │   └── marketplace/[tenantId]/route.ts (GET)
│   │   └── dashboard/
│   │       └── tenants/[id]/
│   │           ├── ModulesTab.tsx (UI component)
│   │           ├── modules-actions.ts (Server Actions)
│   │           ├── TabNav.tsx (updated with Modules tab)
│   │           └── page.tsx (updated to show Modules)
│   └── lib/
│       └── webhooks.ts (updated with new events)
└── MARKETPLACE_API.md (complete API reference)
```

---

## How It Works

### Activating a Module (Example: "Pagos" in Turnflow)

**Step 1: Superadmin toggles in UI**
```
Dashboard → Tenants → Tenant Details → Módulos tab → Toggle "Pagos" ON
```

**Step 2: Server action calls API endpoint**
```typescript
POST /api/tenants/tenant_123/modules/mod_pagos/toggle
Body: { enabled: true }
```

**Step 3: Platform updates database**
```sql
INSERT INTO tenant_module_access (tenant_id, module_id, is_enabled)
VALUES ('tenant_123', 'mod_pagos', true)
ON CONFLICT UPDATE is_enabled = true
```

**Step 4: Platform sends webhook to Turnflow**
```json
POST https://turnflow.lynkko.co/api/platform/webhook
Headers:
  X-Platform-Signature: hmac_sha256_signature
  X-Platform-Timestamp: 1719...
Body:
{
  "event": "module_enabled",
  "tenant_id": "tenant_123",
  "module_id": "mod_pagos",
  "module_slug": "pagos",
  "module_name": "Módulo de Pagos"
}
```

**Step 5: Turnflow processes webhook**
```typescript
// Turnflow's /api/platform/webhook
- Verify HMAC signature
- Parse event
- Update local cache: activeModules["pagos"] = true
- Log event to license_events table
- Return 200 OK
```

**Step 6: Turnflow checks state**
```typescript
// Turnflow middleware or component
const marketplace = await fetchMarketplace(tenantId)
const pagesEnabled = marketplace.apps
  .find(a => a.id === 'turnflow')
  .modules
  .find(m => m.slug === 'pagos')
  .is_enabled
// true
```

---

## Testing Checklist

### Prerequisites
- [ ] Platform migrations applied
- [ ] Environment variables set (PLATFORM_WEBHOOK_SECRET matches Turnflow)
- [ ] Platform running on http://localhost:3000 (or set NEXTAUTH_URL)

### Manual Testing

**1. Check Marketplace Endpoint**
```bash
# Get marketplace view for a tenant
curl -H "Authorization: Bearer $PLATFORM_API_KEY" \
  http://localhost:3000/api/marketplace/tenant_123
# Should return all apps, modules, subscriptions, access status
```

**2. List Modules**
```bash
curl http://localhost:3000/api/tenants/tenant_123/modules?app_id=turnflow
# Should return turnflow's modules with is_enabled status
```

**3. Toggle Module via Dashboard**
- Go to `/dashboard/tenants/tenant_123?tab=modules`
- Find Turnflow section
- Click toggle on any module
- Verify:
  - Toggle switches immediately (optimistic update)
  - Page revalidates
  - Status persists after refresh

**4. Verify Webhook Sent**
```bash
# Check Turnflow logs for webhook receive
# Should see: POST /api/platform/webhook with event "module_enabled"
# Webhook should be verified (HMAC signature valid)
```

**5. End-to-end Flow**
- Create tenant in platform
- Create Turnflow subscription for tenant
- Access Marketplace: `GET /api/marketplace/{tenantId}`
- Toggle a module on via UI
- Check Turnflow received webhook
- Verify Turnflow sees module as enabled in marketplace

---

## API Response Examples

### Marketplace Response
```json
{
  "tenant_id": "tenant_abc123",
  "apps": [
    {
      "id": "turnflow",
      "name": "Turnflow by Lynkko",
      "is_enabled": true,
      "current_subscription": {
        "id": "sub_pro_123",
        "plan_name": "Pro",
        "status": "active",
        "period_end": "2026-07-21T00:00:00Z"
      },
      "modules": [
        {
          "id": "mod_1",
          "slug": "clientes",
          "name": "Gestión de Clientes",
          "is_enabled": true
        },
        {
          "id": "mod_3",
          "slug": "pagos",
          "name": "Módulo de Pagos",
          "is_enabled": false
        }
      ]
    }
  ]
}
```

### Toggle Response
```json
{
  "status": "ok",
  "tenant_id": "tenant_abc123",
  "module_id": "mod_pagos",
  "module_slug": "pagos",
  "enabled": true,
  "webhook_sent": true
}
```

---

## Webhook Examples

### Module Enabled Event
```json
{
  "event": "module_enabled",
  "tenant_id": "tenant_123",
  "module_id": "mod_pagos",
  "module_slug": "pagos",
  "module_name": "Módulo de Pagos"
}
```

### App Enabled Event
```json
{
  "event": "app_enabled",
  "tenant_id": "tenant_123",
  "subscription_id": "sub_pro_123",
  "plan": {
    "id": "plan_pro",
    "name": "Pro",
    "slug": "pro"
  },
  "active_modules": {
    "clientes": true,
    "citas": true,
    "pagos": false
  },
  "period_end": "2026-07-21T00:00:00Z"
}
```

---

## Known Limitations

1. **No RLS Security**: Platform doesn't use Postgres RLS. All multi-tenant isolation via `tenantId` in WHERE clauses.
2. **No Request Auth**: Module toggle endpoints not authenticated (rely on admin session). Consider adding API key auth.
3. **No Audit Log**: Changes are logged via webhooks but not persisted to audit table yet (Fase 2).
4. **Async Webhooks**: Webhook delivery is fire-and-forget. No retry logic or delivery status tracking.

---

## Next Steps (Phase 2)

- [ ] Plan management (Edit, Delete plans)
- [ ] Subscription cancellation with webhooks
- [ ] Invoice/billing endpoints
- [ ] Audit trail table
- [ ] Webhook delivery status tracking
- [ ] Rate limiting and security hardening
- [ ] Admin API key authentication

---

## Support

**Issues?**
1. Check webhooks in Turnflow logs: `POST /api/platform/webhook`
2. Verify HMAC: X-Platform-Signature header matches calculation
3. Check marketplace endpoint returns correct data
4. Verify tenant exists and has subscriptions

**Docs:**
- See MARKETPLACE_API.md for complete endpoint reference
- See PLATFORM_TURNFLOW_INTEGRATION.md for full integration details
