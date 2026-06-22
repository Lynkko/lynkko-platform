# Marketplace API — Plataforma Lynkko

## Descripción General

El Marketplace es un sistema centralizado que permite a todas las aplicaciones (Turnflow, PEC, ClubPass, etc.) conocer las aplicaciones disponibles, sus módulos, planes y estado de suscripción del tenant.

Cada aplicación consulta el Marketplace para:
1. Mostrar qué apps están disponibles para el tenant
2. Mostrar qué módulos están habilitados
3. Sincronizar la configuración de temas
4. Mostrar información de la suscripción actual

---

## Endpoints

### 1. GET `/api/marketplace/{tenantId}`

Obtiene todas las aplicaciones y módulos disponibles para un tenant, con su estado de activación.

**Parámetros:**
- `tenantId` (path, required) — UUID del tenant

**Response:**
```json
{
  "tenant_id": "tenant_abc123",
  "apps": [
    {
      "id": "turnflow",
      "name": "Turnflow by Lynkko",
      "description": "SaaS de turnos, citas y reservas",
      "url": "https://turnflow.lynkko.co",
      "is_enabled": true,
      "current_subscription": {
        "id": "sub_xyz789",
        "plan_name": "Pro",
        "status": "active",
        "period_end": "2026-07-21T00:00:00Z"
      },
      "modules": [
        {
          "id": "mod_1",
          "slug": "clientes",
          "name": "Gestión de Clientes",
          "description": "CRM integrado",
          "is_enabled": true
        },
        {
          "id": "mod_2",
          "slug": "citas",
          "name": "Reserva de Citas",
          "description": "Sistema de citas y turnos",
          "is_enabled": true
        },
        {
          "id": "mod_3",
          "slug": "pagos",
          "name": "Módulo de Pagos",
          "description": "Procesamiento con Wompi",
          "is_enabled": false
        }
      ]
    },
    {
      "id": "pec",
      "name": "Lynkko App (PEC)",
      "description": "Plataforma de Éxito Comercial",
      "url": "https://app.lynkko.co",
      "is_enabled": false,
      "current_subscription": null,
      "modules": []
    }
  ],
  "total_apps": 7,
  "timestamp": "2026-06-21T10:30:00Z"
}
```

---

### 2. GET `/api/tenants/{tenantId}/modules?app_id={appId}`

Obtiene todos los módulos de una aplicación específica con su estado de activación.

**Parámetros:**
- `tenantId` (path, required) — UUID del tenant
- `app_id` (query, optional) — Filtrar por aplicación (ej: "turnflow")

**Response:**
```json
{
  "tenant_id": "tenant_abc123",
  "modules": [
    {
      "id": "mod_1",
      "appId": "turnflow",
      "slug": "clientes",
      "name": "Gestión de Clientes",
      "description": "CRM integrado",
      "isActive": true,
      "isEnabled": true
    },
    {
      "id": "mod_2",
      "appId": "turnflow",
      "slug": "citas",
      "name": "Reserva de Citas",
      "description": "Sistema de citas y turnos",
      "isActive": true,
      "isEnabled": true
    }
  ],
  "total": 2
}
```

---

### 3. POST `/api/tenants/{tenantId}/modules/{moduleId}/toggle`

Activa o desactiva un módulo para un tenant.

**Parámetros:**
- `tenantId` (path, required) — UUID del tenant
- `moduleId` (path, required) — UUID del módulo

**Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "status": "ok",
  "tenant_id": "tenant_abc123",
  "module_id": "mod_1",
  "module_slug": "clientes",
  "enabled": true,
  "webhook_sent": true
}
```

**Webhook enviado:**
```json
{
  "event": "module_enabled",
  "tenant_id": "tenant_abc123",
  "module_id": "mod_1",
  "module_slug": "clientes",
  "module_name": "Gestión de Clientes"
}
```

---

### 4. POST `/api/tenants/{tenantId}/apps/{appId}/toggle`

Activa o desactiva una aplicación para un tenant.

**Parámetros:**
- `tenantId` (path, required) — UUID del tenant
- `appId` (path, required) — ID de la aplicación (ej: "turnflow")

**Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "status": "ok",
  "tenant_id": "tenant_abc123",
  "app_id": "turnflow",
  "enabled": true,
  "subscription": {
    "id": "sub_xyz789",
    "plan": "Pro"
  },
  "webhook_sent": true
}
```

**Webhook enviado:**
```json
{
  "event": "app_enabled",
  "tenant_id": "tenant_abc123",
  "subscription_id": "sub_xyz789",
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

## Integración en Aplicaciones

### Turnflow

Para integrar el marketplace en Turnflow:

```typescript
// src/lib/marketplace.ts
import { cache } from 'react'

const PLATFORM_URL = process.env.PLATFORM_URL
const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY

export const fetchMarketplace = cache(async (tenantId: string) => {
  const res = await fetch(
    `${PLATFORM_URL}/api/marketplace/${tenantId}`,
    {
      headers: {
        'Authorization': `Bearer ${PLATFORM_API_KEY}`,
      },
    }
  )

  if (!res.ok) throw new Error('Failed to fetch marketplace')
  return res.json()
})

// Uso en la app:
const marketplace = await fetchMarketplace(brandId)

// Mostrar apps disponibles
marketplace.apps.forEach(app => {
  console.log(`${app.name} (${app.is_enabled ? 'enabled' : 'disabled'})`)
})

// Verificar si un módulo está habilitado
const turnflow = marketplace.apps.find(a => a.id === 'turnflow')
const clientesEnabled = turnflow?.modules.find(m => m.slug === 'clientes')?.is_enabled
```

### Mirar el marketplace en el Dashboard

La plataforma tiene una interfaz web en `/dashboard/tenants/{tenantId}?tab=modules` donde los superadmins pueden:
- Ver todas las aplicaciones disponibles
- Ver todos los módulos de cada aplicación
- Activar/desactivar módulos
- Recibir webhooks automáticos cuando cambia el estado

---

## Flujo de Activación de Módulo

```
1. Superadmin activa módulo en plataforma
   POST /api/tenants/{tenantId}/modules/{moduleId}/toggle
   
2. Plataforma actualiza tenant_module_access
   
3. Plataforma envía webhook a la app
   POST {APP_WEBHOOK_URL} con evento "module_enabled"
   
4. Turnflow recibe webhook y procesa el cambio
   
5. Turnflow puede verificar estado via marketplace API
   GET /api/marketplace/{tenantId}
```

---

## Webhooks

### Eventos soportados

| Evento | Descripción | Cuándo se envía |
|--------|------------|-----------------|
| `module_enabled` | Un módulo fue habilitado | POST toggle con enabled=true |
| `module_disabled` | Un módulo fue deshabilitado | POST toggle con enabled=false |
| `app_enabled` | Una app fue habilitada | POST toggle app con enabled=true |
| `app_disabled` | Una app fue deshabilitada | POST toggle app con enabled=false |
| `subscription_activated` | Nueva suscripción creada | POST /api/subscriptions/create |
| `plan_changed` | Plan de suscripción cambió | POST /api/subscriptions/create (update) |
| `subscription_suspended` | Suscripción pausada | (Fase 2) |
| `subscription_canceled` | Suscripción cancelada | (Fase 2) |

### Validación de Webhooks

Todos los webhooks están firmados con HMAC-SHA256. El proceso de validación:

```typescript
import crypto from 'crypto'

function verifyWebhook(payload: string, signature: string, timestamp: string, secret: string): boolean {
  const message = `${timestamp}.${payload}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex')
  
  return signature === expectedSignature
}

// Uso en webhook handler:
const signature = req.headers.get('x-platform-signature')
const timestamp = req.headers.get('x-platform-timestamp')
const body = await req.text()

const verified = verifyWebhook(
  body,
  signature!,
  timestamp!,
  process.env.PLATFORM_WEBHOOK_SECRET!
)

if (!verified) {
  return res.status(401).json({ error: 'Invalid signature' })
}
```

---

## Rate Limiting

No hay rate limiting en estos endpoints. En producción, se recomienda:
- Cachear respuestas del marketplace por 5 minutos
- Usar ISR (Incremental Static Regeneration) en Next.js
- Validar tenantId para evitar escaneo de recursos

---

## Errores

| Status | Descripción |
|--------|-----------|
| 200 | Éxito |
| 400 | Parámetros inválidos |
| 404 | Recurso no encontrado |
| 500 | Error del servidor |

Ejemplo de error:
```json
{
  "error": "Module not found",
  "status": 404
}
```

---

## Cambios Próximos (Fase 2)

- [ ] Editar planes existentes (PUT /api/plans/{planId})
- [ ] Cancelar suscripciones con webhooks (DELETE /api/subscriptions/{subId})
- [ ] Generación de facturas (POST /api/invoices)
- [ ] Rate limiting
- [ ] Audit trail de cambios
