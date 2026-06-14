# Guía de consumo — paquetes `@lynkko/*`

Referencia completa para instalar y usar los paquetes del ecosistema Lynkko desde cualquier app.  
Todos los paquetes están publicados en **GitHub Packages** bajo el scope `@lynkko`.

---

## Índice

1. [Prerequisitos](#1-prerequisitos)
2. [Instalación base](#2-instalación-base)
3. [@lynkko/utils](#3-lynkkoutils)
4. [@lynkko/db](#4-lynkkodb)
5. [@lynkko/push](#5-lynkkopush)
6. [@lynkko/webhooks](#6-lynkkowebhooks)
7. [@lynkko/email](#7-lynkkoemail)
8. [@lynkko/wompi](#8-lynkkowompi)
9. [Variables de entorno — resumen](#9-variables-de-entorno--resumen)
10. [Patrón de app context](#10-patrón-de-app-context)
11. [Notas de migración desde Supabase](#11-notas-de-migración-desde-supabase)

---

## 1. Prerequisitos

### 1.1 Acceso a GitHub Packages

Los paquetes se instalan desde `https://npm.pkg.github.com`.  
Para poder hacer `npm install` / `pnpm install`, necesitas autenticación con GitHub.

**Opción A — Token personal (desarrollo local)**

1. Ir a GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
2. Crear un token con el scope **`read:packages`**
3. Guardar el token (se muestra solo una vez)

**Opción B — Variable de entorno ya configurada**

Si ya tienes un `GITHUB_TOKEN` en el entorno con `read:packages`, funciona directamente.

### 1.2 `.npmrc` en la raíz de cada proyecto

Crea (o edita) el archivo `.npmrc` en la raíz de tu proyecto:

```ini
# .npmrc
@lynkko:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

> **Importante:** `pnpm` no expande variables de entorno en `.npmrc` de proyecto.  
> Para desarrollo local, copia esta línea en tu `~/.npmrc` con el token hardcoded:
>
> ```ini
> # ~/.npmrc  (solo local, no commitear)
> //npm.pkg.github.com/:_authToken=ghp_TU_TOKEN_AQUI
> ```
>
> Para CI (GitHub Actions), el workflow del proyecto consumidor debe hacer la misma sustitución:
>
> ```yaml
> - name: Inject GitHub token
>   run: sed -i "s|\${GITHUB_TOKEN}|${{ secrets.GITHUB_TOKEN }}|g" .npmrc
> ```

### 1.3 Versión de Node.js recomendada

**Node.js 18+** (fetch nativo, Web Push API). Todos los paquetes están compilados a `ES2022`.

---

## 2. Instalación base

Instala solo los paquetes que necesitas en cada proyecto:

```bash
# pnpm (recomendado)
pnpm add @lynkko/utils @lynkko/db @lynkko/email

# npm
npm install @lynkko/utils @lynkko/db @lynkko/email

# yarn
yarn add @lynkko/utils @lynkko/db @lynkko/email
```

Cada paquete es independiente. No hay un paquete "umbrella" que los agrupe.

---

## 3. `@lynkko/utils`

**Instalación:**
```bash
pnpm add @lynkko/utils
```

**Peer dependencies:** `next >= 15` (solo si usas los HTTP helpers)

### 3.1 `cn()` — Merge de clases CSS

Combina `clsx` + `tailwind-merge`. Úsala en todos los componentes en lugar de concatenar strings.

```typescript
import { cn } from '@lynkko/utils'

// Uso básico
cn('px-4 py-2', isActive && 'bg-blue-500')

// Con variantes
cn(
  'rounded-md text-sm font-medium',
  variant === 'primary' && 'bg-blue-600 text-white',
  variant === 'ghost'   && 'bg-transparent text-gray-700',
  className,
)
```

**Contrato:** Acepta cualquier valor `ClassValue` (string, array, objeto condicional). Devuelve `string`.

---

### 3.2 Formatters

#### `formatCurrency(amount, currency?)`

```typescript
import { formatCurrency } from '@lynkko/utils'

formatCurrency(150000)          // "$ 150.000"
formatCurrency(99.99, 'USD')    // "US$ 99,99"
formatCurrency(49.5, 'EUR')     // "€ 49,50"
```

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `amount` | `number` | — | Valor numérico |
| `currency` | `'COP' \| 'USD' \| 'EUR'` | `'COP'` | Moneda |

**Notas:** Usa `Intl.NumberFormat` con locale `es-CO`. COP sin decimales, USD/EUR con 2 decimales.

---

#### `formatPoints(points)`

```typescript
import { formatPoints } from '@lynkko/utils'

formatPoints(12500)   // "12.500"
formatPoints(1000000) // "1.000.000"
```

Formatea números enteros con separadores de miles (locale `es-CO`).

---

#### `formatDate(date, options?)`

```typescript
import { formatDate } from '@lynkko/utils'

formatDate(new Date())              // "14 jun. 2026"
formatDate('2026-01-15')            // "15 ene. 2026"
formatDate(new Date(), {
  dateStyle: 'full',
})                                   // "domingo, 14 de junio de 2026"
formatDate(new Date(), {
  dateStyle: undefined,
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})                                   // "14 de junio de 2026"
```

| Parámetro | Tipo | Default |
|-----------|------|---------|
| `date` | `Date \| string` | — |
| `options` | `Intl.DateTimeFormatOptions` | `{ dateStyle: 'medium' }` |

---

#### `formatRelativeTime(date)`

```typescript
import { formatRelativeTime } from '@lynkko/utils'

formatRelativeTime(new Date())                   // "Ahora mismo"
formatRelativeTime(new Date(Date.now() - 300000)) // "Hace 5 min"
formatRelativeTime(new Date(Date.now() - 7200000))// "Hace 2h"
formatRelativeTime(new Date(Date.now() - 172800000))// "Hace 2d"
// Más de 7 días → formatDate()
```

---

### 3.3 HTTP helpers (Next.js Route Handlers)

Todos devuelven `NextResponse` con el status HTTP correcto. Reemplazan el `NextResponse.json()` manual.

```typescript
import {
  ok, created, badRequest, unauthorized,
  forbidden, notFound, conflict, serverError,
} from '@lynkko/utils'

// app/api/leads/route.ts
export async function GET() {
  const leads = await db.select().from(leadsTable)
  return ok(leads)                         // 200
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.name) return badRequest('El nombre es requerido')
  const lead = await createLead(body)
  return created(lead)                     // 201
}

// Respuestas de error
return unauthorized()                      // 401 "No autenticado"
return unauthorized('Sesión expirada')     // 401 mensaje custom
return forbidden()                         // 403 "Acceso denegado"
return forbidden('Plan insuficiente')      // 403 mensaje custom
return notFound()                          // 404 "No encontrado"
return notFound('Lead no existe')          // 404 mensaje custom
return conflict('Email ya registrado')     // 409
return serverError()                       // 500 "Error interno del servidor"
return serverError('Falló la integración') // 500 mensaje custom

// Con detalles de validación
return badRequest('Datos inválidos', {
  fields: { email: 'Formato incorrecto' }
})
```

**Formato de respuesta JSON:**

```json
// ok() / created()
{ ...data }

// errores
{ "error": "mensaje", "details": { ... } }
```

---

### 3.4 Utilidades generales

#### `slugify(text)`

```typescript
import { slugify } from '@lynkko/utils'

slugify('Álvaro García Rodríguez')  // "alvaro-garcia-rodriguez"
slugify('Lynkko App 2026')           // "lynkko-app-2026"
slugify('  espacios  extra  ')       // "espacios-extra"
```

Normaliza NFD, elimina diacríticos, reemplaza todo lo que no sea `[a-z0-9]` con `-`.

---

#### `generateId(prefix?)`

```typescript
import { generateId } from '@lynkko/utils'

generateId()           // "k3x9m2p7"  (8 chars aleatorios base36)
generateId('lead')     // "lead_k3x9m2p7"
generateId('inv')      // "inv_k3x9m2p7"
```

IDs cortos de 8 caracteres base36. Para IDs de DB usa el UUID de Drizzle/Neon.  
**Usar para:** referencias de pago, códigos de invitación, slugs temporales.

---

#### `sleep(ms)`

```typescript
import { sleep } from '@lynkko/utils'

await sleep(1000)  // espera 1 segundo
```

---

#### `pick(obj, keys)` y `omit(obj, keys)`

```typescript
import { pick, omit } from '@lynkko/utils'

const user = { id: '1', name: 'Ana', password: 'hash', role: 'admin' }

pick(user, ['id', 'name'])      // { id: '1', name: 'Ana' }
omit(user, ['password'])        // { id: '1', name: 'Ana', role: 'admin' }
```

Completamente tipados — TypeScript infiere los tipos del resultado.

---

### 3.5 Type guards

```typescript
import { isDefined, isString } from '@lynkko/utils'

// isDefined
const items = [1, null, 3, undefined, 5]
items.filter(isDefined)   // [1, 3, 5] — tipo inferred: number[]

// isString
const value: unknown = 'hola'
if (isString(value)) {
  value.toUpperCase()  // TypeScript sabe que es string
}
```

---

## 4. `@lynkko/db`

**Instalación:**
```bash
pnpm add @lynkko/db drizzle-orm
```

> `drizzle-orm` debe instalarse en el proyecto consumidor para definir el schema.  
> `@neondatabase/serverless` NO necesitas instalarlo — está incluido en `@lynkko/db`.

**Variables de entorno requeridas:**

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Conexión pooled (Neon → Connection string con `?sslmode=require`) |
| `DATABASE_URL_UNPOOLED` | Conexión directa para migraciones (sin PgBouncer) |

Ambas se obtienen desde el dashboard de Neon en cada proyecto/branch.

---

### 4.1 Setup en cada app

**Paso 1: Definir el schema**

```typescript
// src/lib/db/schema.ts
import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core'

export const leads = pgTable('leads', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull(),
  name:      text('name').notNull(),
  email:     text('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const tenants = pgTable('tenants', {
  id:   uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
})
```

**Paso 2: Crear el cliente**

```typescript
// src/lib/db/index.ts
import { createDb } from '@lynkko/db'
import * as schema from './schema'

export const db = createDb(schema)
export type Db = typeof db
```

**Paso 3: Usar en Route Handlers y Server Actions**

```typescript
// app/api/leads/route.ts
import { db } from '@/lib/db'
import { leads } from '@/lib/db/schema'
import { eq, desc } from '@lynkko/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')!

  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.tenantId, tenantId))
    .orderBy(desc(leads.createdAt))

  return Response.json(result)
}
```

---

### 4.2 Operadores exportados

`@lynkko/db` re-exporta los operadores más usados de `drizzle-orm` para que no necesites importar `drizzle-orm` en los Route Handlers:

```typescript
import {
  // Comparación
  eq, ne, gt, gte, lt, lte,
  // Lógica
  and, or, not,
  // Null checks
  isNull, isNotNull,
  // Arrays
  inArray, notInArray,
  // Texto
  like, ilike,
  // Rango
  between,
  // SQL raw
  sql,
  // Ordenamiento
  asc, desc,
  // Agregaciones
  count, sum, avg, max, min,
  // Tipos de Drizzle
  type InferSelectModel,
  type InferInsertModel,
} from '@lynkko/db'
```

> Si necesitas funciones más avanzadas (`jsonb_`, `array_agg`, etc.), instala `drizzle-orm` directamente en el proyecto y usa `import { ... } from 'drizzle-orm'`.

---

### 4.3 `createDbDirect()` — Migraciones

Para migraciones con `drizzle-kit`, necesitas una conexión directa (no pooled):

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
})
```

```bash
pnpm dlx drizzle-kit generate
pnpm dlx drizzle-kit migrate
```

El `createDbDirect()` solo úsalo si necesitas ejecutar migraciones programáticamente:

```typescript
// scripts/migrate.ts
import { createDbDirect } from '@lynkko/db'
import * as schema from '../src/lib/db/schema'

const db = createDbDirect(schema)
// ...
```

---

### 4.4 Tipo `LynkkoDb`

Para pasar `db` por parámetros con tipado correcto:

```typescript
import { type LynkkoDb } from '@lynkko/db'

// Incorrecto — el tipo no infiere el schema
function getLeads(db: LynkkoDb) { ... }

// Correcto — usa el tipo del db local
import { type Db } from '@/lib/db'
function getLeads(db: Db) { ... }
```

> `LynkkoDb` es el tipo base sin schema. Dentro de cada app, usa `typeof db` de tu `src/lib/db/index.ts`.

---

### 4.5 Multi-tenancy

**RLS NO se usa** — el filtrado por tenant es siempre explícito en el código:

```typescript
// Siempre filtrar por tenantId en cada query
const result = await db
  .select()
  .from(leads)
  .where(
    and(
      eq(leads.tenantId, ctx.tenantId),  // ← NUNCA omitir
      eq(leads.status, 'active'),
    )
  )

// ❌ Nunca hacer esto (leaks cross-tenant data)
const allLeads = await db.select().from(leads)
```

---

## 5. `@lynkko/push`

**Instalación:**
```bash
pnpm add @lynkko/push
```

**Variables de entorno requeridas:**

| Variable | Scope | Descripción |
|----------|-------|-------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Público (browser) | Clave pública VAPID |
| `VAPID_PRIVATE_KEY` | Servidor únicamente | Clave privada VAPID |
| `VAPID_SUBJECT` | Servidor (opcional) | Default: `mailto:hola@lynkko.co` |

**Generar claves VAPID (una sola vez por app):**

```bash
node -e "const {generateVapidKeys} = require('@lynkko/push'); console.log(generateVapidKeys())"
```

Guarda el resultado en tus variables de entorno. **No regeneres** — perderás todas las suscripciones activas.

---

### 5.1 Flujo completo

**Paso 1: Registrar el Service Worker (browser)**

```typescript
// src/lib/push-client.ts
export async function subscribeToPush(): Promise<PushSubscriptionJSON | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  })

  return sub.toJSON()
}
```

**Paso 2: Guardar la suscripción en DB**

```typescript
// app/api/push/subscribe/route.ts
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { ok, badRequest } from '@lynkko/utils'

export async function POST(req: Request) {
  const { endpoint, keys } = await req.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return badRequest('Suscripción inválida')
  }

  await db.insert(pushSubscriptions).values({
    tenantId: ctx.tenantId,
    userId:   ctx.userId,
    endpoint,
    p256dh:   keys.p256dh,
    auth:     keys.auth,
  }).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: { p256dh: keys.p256dh, auth: keys.auth },
  })

  return ok({ subscribed: true })
}
```

**Schema sugerido:**

```typescript
export const pushSubscriptions = pgTable('push_subscriptions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull(),
  userId:    uuid('user_id'),
  endpoint:  text('endpoint').notNull().unique(),
  p256dh:    text('p256dh').notNull(),
  auth:      text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Paso 3: Enviar notificaciones (servidor)**

```typescript
// src/lib/notifications.ts
import { sendPush, sendPushToMany, type PushSubscription } from '@lynkko/push'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { eq, inArray } from '@lynkko/db'

// Enviar a un usuario
export async function notifyUser(userId: string, title: string, body: string) {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))

  const results = await sendPushToMany(subs, { title, body, url: '/dashboard' })

  // Limpiar suscripciones vencidas
  const expired = results.filter(r => r.expired).map(r => r.endpoint)
  if (expired.length > 0) {
    await db.delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, expired))
  }
}

// Enviar a todo el tenant
export async function notifyTenant(tenantId: string, title: string, body: string) {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.tenantId, tenantId))

  return sendPushToMany(subs, { title, body })
}
```

---

### 5.2 API de referencia

#### `sendPush(subscription, payload): Promise<PushResult>`

```typescript
import { sendPush } from '@lynkko/push'

const result = await sendPush(
  { endpoint, p256dh, auth },
  {
    title:    'Nueva cita agendada',
    body:     'Juan Pérez — Hoy 3:00 PM',
    icon:     '/icons/icon-192.png',     // opcional
    badge:    '/icons/badge-72.png',     // opcional
    url:      '/citas/123',              // URL al hacer click
    tag:      'cita-123',               // reemplaza notif anterior con mismo tag
    renotify: true,                      // vibrar aunque tag exista
    data:     { citaId: '123' },         // datos extra para el SW
  }
)

if (!result.success && result.expired) {
  // Eliminar endpoint de la DB
}
```

**`PushResult`:**

```typescript
interface PushResult {
  success:  boolean
  endpoint: string
  error?:   string
  expired?: boolean  // true = HTTP 404/410, eliminar de DB
}
```

---

#### `sendPushToMany(subscriptions, payload): Promise<PushResult[]>`

Envío paralelo a múltiples suscripciones. Best-effort — no lanza excepciones.

```typescript
const results = await sendPushToMany(subscriptions, payload)
const expired = results.filter(r => r.expired).map(r => r.endpoint)
// eliminar expired de DB
```

---

### 5.3 Service Worker (requerido en cada app)

El SW debe estar en `/public/sw.js`:

```javascript
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:     data.body,
      icon:     data.icon ?? '/icons/icon-192.png',
      badge:    data.badge ?? '/icons/badge-72.png',
      tag:      data.tag,
      renotify: data.renotify,
      data:     data.data,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(cs => {
      const existing = cs.find(c => c.url.includes(url))
      return existing ? existing.focus() : clients.openWindow(url)
    })
  )
})
```

---

## 6. `@lynkko/webhooks`

**Instalación:**
```bash
pnpm add @lynkko/webhooks
```

Sin dependencias de runtime — solo usa `crypto` de Node.js.

---

### 6.1 Enviar webhooks (outbound)

Para notificar sistemas externos cuando ocurre algo en tu app:

```typescript
// src/lib/webhooks.ts
import { dispatchWebhookToMany } from '@lynkko/webhooks'
import { db } from '@/lib/db'
import { webhookEndpoints } from '@/lib/db/schema'
import { eq } from '@lynkko/db'

export async function emitEvent<T>(
  tenantId: string,
  event: string,
  data: T,
) {
  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.tenantId, tenantId))

  void dispatchWebhookToMany(endpoints, event, data)
  // fire-and-forget: no bloquea la respuesta HTTP
}

// Uso en un Route Handler
await emitEvent(tenantId, 'lead.created', { id: lead.id, name: lead.name })
```

**Schema sugerido:**

```typescript
export const webhookEndpoints = pgTable('webhook_endpoints', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull(),
  url:       text('url').notNull(),
  secret:    text('secret').notNull(),
  events:    text('events').array(),  // null = todos los eventos
  active:    boolean('active').notNull().default(true),
})
```

**Filtrado de eventos:**  
Si `endpoint.events` es `null` o `undefined`, recibe todos.  
Si es `['*']`, recibe todos.  
Si es `['lead.created', 'lead.updated']`, solo esos.

---

### 6.2 Recibir webhooks (inbound)

Para verificar webhooks que otros sistemas te mandan a ti:

```typescript
// app/api/webhooks/wompi/route.ts  (ejemplo con Wompi)
import { verifyWebhook } from '@lynkko/webhooks'

export async function POST(req: Request) {
  const raw = await req.text()
  const signature  = req.headers.get('X-Lynkko-Signature') ?? ''
  const timestamp  = Number(req.headers.get('X-Lynkko-Timestamp') ?? '0')

  const valid = verifyWebhook(
    process.env.WEBHOOK_SECRET!,
    raw,
    signature,
    timestamp,
    5 * 60 * 1000, // 5 min de tolerancia (default)
  )

  if (!valid) return Response.json({ error: 'Firma inválida' }, { status: 401 })

  const event = JSON.parse(raw)
  // procesar event.data...
  return Response.json({ ok: true })
}
```

---

### 6.3 API de referencia

#### `signWebhook(secret, body, timestamp): string`

```typescript
const sig = signWebhook('mi-secreto', '{"event":"test"}', Date.now())
// "sha256=a3f9..."
```

Algoritmo: `HMAC-SHA256(secret, "${timestamp}.${body}")` → `sha256=<hex>`

---

#### `verifyWebhook(secret, body, signature, timestamp, toleranceMs?): boolean`

```typescript
const valid = verifyWebhook(secret, body, signature, timestamp)
// Rechaza si timestamp > 5 min en el pasado (replay attack protection)
// Usa timingSafeEqual internamente (timing-attack safe)
```

---

#### `webhookHeaders(secret, body, event): Record<string, string>`

Genera los headers para un outbound webhook:

```typescript
const headers = webhookHeaders(secret, body, 'lead.created')
// {
//   'Content-Type': 'application/json',
//   'X-Lynkko-Signature': 'sha256=...',
//   'X-Lynkko-Event': 'lead.created',
//   'X-Lynkko-Timestamp': '1718399999000',
// }
```

---

#### `dispatchWebhook(endpoint, event, data, timeoutMs?): Promise<DispatchResult>`

```typescript
const result = await dispatchWebhook(
  { url: 'https://api.cliente.com/webhook', secret: 'abc123' },
  'invoice.paid',
  { invoiceId: 'inv_01', amount: 150000 },
  8000, // timeout en ms (default: 8000)
)

// result: { url, success, statusCode?, error? }
```

No lanza excepciones. Si el endpoint falla, `result.success === false`.

---

#### `dispatchWebhookToMany(endpoints, event, data, timeoutMs?): Promise<DispatchResult[]>`

```typescript
void dispatchWebhookToMany(
  endpoints,
  'lead.created',
  { id: '123', name: 'Juan' },
)
// Filtra automáticamente endpoints que no escuchan el evento
// Ejecuta en paralelo
// fire-and-forget recomendado con void
```

---

## 7. `@lynkko/email`

**Instalación:**
```bash
pnpm add @lynkko/email
```

**Variables de entorno requeridas:**

| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | API key de Resend (obtenida en resend.com) |
| `RESEND_FROM_EMAIL` | Remitente por defecto (ej: `Lynkko <no-reply@lynkko.co>`) — opcional |

---

### 7.1 Envío de emails

#### `sendEmail(options): Promise<EmailResult>` — best-effort

No lanza excepciones. Loguea errores y retorna `{ success: false }`.  
Usar cuando el email es complementario, no crítico.

```typescript
import { sendEmail } from '@lynkko/email'

const result = await sendEmail({
  to: 'juan@ejemplo.co',
  subject: 'Bienvenido a Lynkko',
  html: '<h1>Hola Juan</h1><p>Tu cuenta fue creada.</p>',
})

if (!result.success) {
  console.warn('Email no enviado:', result.error)
  // continúa — no bloquea el flujo
}
```

```typescript
interface SendEmailOptions {
  to:       string | string[]  // uno o varios destinatarios
  subject:  string
  html:     string
  from?:    string             // default: RESEND_FROM_EMAIL ?? 'Lynkko <no-reply@lynkko.co>'
  replyTo?: string
  cc?:      string | string[]
  bcc?:     string | string[]
  tags?:    Array<{ name: string; value: string }>  // para analytics en Resend
}

interface EmailResult {
  success: boolean
  id?:     string   // ID de Resend si el envío fue exitoso
  error?:  string   // mensaje de error si success === false
}
```

---

#### `sendEmailOrThrow(options): Promise<string>` — estricto

Lanza excepción si el envío falla. Usar para emails críticos (confirmaciones de pago, invitaciones).

```typescript
import { sendEmailOrThrow } from '@lynkko/email'

// Lanza si falla — dejar que el Route Handler devuelva 500
const emailId = await sendEmailOrThrow({
  to: user.email,
  subject: 'Confirmación de pago',
  html: paymentConfirmationHtml,
})
```

---

### 7.2 Template base

```typescript
import { sendEmail, lynkkoEmailTemplate } from '@lynkko/email'

const html = lynkkoEmailTemplate({
  title: 'Nueva cita confirmada',
  content: `
    <p>Hola <strong>Juan</strong>,</p>
    <p>Tu cita para el <strong>15 de junio a las 3:00 PM</strong> fue confirmada.</p>
  `,
  primaryColor: '#166534',          // opcional, default: verde Lynkko
  logoUrl: 'https://lynkko.co/logo.png', // opcional, default: texto "Lynkko"
  footerText: 'Turnflow · Gestión de turnos', // opcional
  ctaText: 'Ver mis citas',         // opcional — genera botón
  ctaUrl: 'https://app.lynkko.co/citas',
})

await sendEmail({
  to: 'juan@ejemplo.co',
  subject: 'Cita confirmada',
  html,
})
```

**Personalización por app:**

```typescript
// src/lib/email.ts — wrapper por app
import { sendEmail, lynkkoEmailTemplate, type SendEmailOptions } from '@lynkko/email'

export function appEmail(options: SendEmailOptions & {
  title?: string
  content?: string
}) {
  const { title, content, ...emailOptions } = options
  return sendEmail({
    ...emailOptions,
    from: 'Turnflow <no-reply@turnflow.co>',
    html: title && content
      ? lynkkoEmailTemplate({
          title,
          content,
          primaryColor: '#1d4ed8',  // azul Turnflow
        })
      : emailOptions.html!,
  })
}
```

---

## 8. `@lynkko/wompi`

**Instalación:**
```bash
pnpm add @lynkko/wompi
```

Sin dependencias de runtime — usa `fetch` y `crypto` nativos de Node.js.

**Variables de entorno requeridas:**

| Variable | Descripción |
|----------|-------------|
| `WOMPI_PUBLIC_KEY` | Llave pública (`pub_prod_...` o `pub_test_...`) |
| `WOMPI_PRIVATE_KEY` | Llave privada (`prv_prod_...` o `prv_test_...`) |
| `WOMPI_WEBHOOK_SECRET` | Secreto de eventos para verificar webhooks (desde panel Wompi) |
| `WOMPI_SANDBOX` | `'true'` para usar sandbox — omitir en producción |

---

### 8.1 Flujo completo de pago con tarjeta

**Paso 1: Obtener tokens de aceptación (backend)**

```typescript
// app/api/billing/acceptance-tokens/route.ts
import { createWompiClient } from '@lynkko/wompi'
import { ok } from '@lynkko/utils'

const wompi = createWompiClient()

export async function GET() {
  const tokens = await wompi.getAcceptanceTokens()
  return ok(tokens)
}

// Respuesta:
// { acceptanceToken: '...', personalDataToken: '...' }
```

Los tokens son efímeros (expiran en ~10 min). Obtenerlos justo antes de mostrar el formulario.

---

**Paso 2: Tokenizar la tarjeta (frontend con Wompi.js)**

```html
<!-- El tokenizado de la tarjeta se hace client-side con la lib de Wompi -->
<!-- Ver docs: https://docs.wompi.co/docs/colombia/widget-checkout-de-pago -->
```

Wompi retorna un `cardToken` que el frontend envía al backend.

---

**Paso 3: Crear fuente de pago (backend)**

```typescript
// app/api/billing/payment-sources/route.ts
import { createWompiClient, WompiError } from '@lynkko/wompi'
import { ok, badRequest, serverError } from '@lynkko/utils'

const wompi = createWompiClient()

export async function POST(req: Request) {
  const { cardToken, acceptanceToken, personalDataToken } = await req.json()

  try {
    const source = await wompi.createPaymentSource(
      cardToken,
      acceptanceToken,
      personalDataToken,
      user.email,
    )
    // Guardar source.id en DB (es el paymentSourceId para cobros futuros)
    await db.insert(paymentSources).values({
      userId: user.id,
      wompiId: source.id,
      brand: source.brand,
      lastFour: source.lastFour,
      expYear: source.expYear,
      expMonth: source.expMonth,
    })
    return ok(source)
  } catch (err) {
    if (err instanceof WompiError) return badRequest(err.message)
    return serverError()
  }
}
```

**`WompiPaymentSource`:**

```typescript
interface WompiPaymentSource {
  id:         number    // ID para usar en cobros futuros
  token:      string
  brand:      string    // 'VISA', 'MASTERCARD', etc.
  lastFour:   string    // '4242'
  expYear:    string    // '26'
  expMonth:   string    // '12'
  cardHolder: string    // 'JUAN GARCIA'
}
```

---

**Paso 4: Cobrar (backend)**

```typescript
// app/api/billing/charge/route.ts
import { createWompiClient, WompiError, toCents } from '@lynkko/wompi'
import { generateId } from '@lynkko/utils'

const wompi = createWompiClient()

export async function POST(req: Request) {
  const { paymentSourceId, amountCOP, planId } = await req.json()

  try {
    const transaction = await wompi.charge({
      paymentSourceId,
      amountInCents: toCents(amountCOP),  // 150000 COP → 15000000 centavos
      currency: 'COP',
      reference: generateId('txn'),
      customerEmail: user.email,
      installments: 1,                    // cuotas (default: 1)
    })

    // Guardar en DB
    await db.insert(payments).values({
      wompiTransactionId: transaction.id,
      status: transaction.status,        // 'PENDING' | 'APPROVED' | 'DECLINED' | ...
      amountInCents: transaction.amountInCents,
      reference: transaction.reference,
    })

    return ok(transaction)
  } catch (err) {
    if (err instanceof WompiError) return badRequest(err.message, { statusCode: err.statusCode })
    return serverError()
  }
}
```

**`WompiChargeOptions`:**

```typescript
interface WompiChargeOptions {
  paymentSourceId: number    // ID de la fuente de pago
  amountInCents:   number    // valor en centavos (usar toCents())
  currency:        'COP' | 'USD'
  reference:       string    // referencia única por transacción
  customerEmail:   string
  redirectUrl?:    string    // URL de redirección post-pago (opcional)
  installments?:   number    // cuotas (default: 1)
}
```

---

**Paso 5: Verificar estado (polling o webhook)**

```typescript
// Consulta directa
const transaction = await wompi.getTransaction(transactionId)
// transaction.status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR'
```

---

### 8.2 Webhook de Wompi

```typescript
// app/api/billing/wompi-webhook/route.ts
import { createWompiClient } from '@lynkko/wompi'

const wompi = createWompiClient()

export async function POST(req: Request) {
  const raw = await req.text()
  const checksum = req.headers.get('x-event-checksum') ?? ''

  if (!wompi.verifyWebhookSignature(raw, checksum)) {
    return Response.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const event = JSON.parse(raw)
  const { transaction } = event.data

  if (event.event === 'transaction.updated') {
    await db
      .update(payments)
      .set({ status: transaction.status })
      .where(eq(payments.wompiTransactionId, transaction.id))

    if (transaction.status === 'APPROVED') {
      // activar plan, enviar email de confirmación, etc.
    }
  }

  return Response.json({ ok: true })
}
```

> El secreto de eventos se obtiene en el panel de Wompi → Configuración → Eventos.  
> En sandbox, puedes usar cualquier string si `WOMPI_WEBHOOK_SECRET` no está definido.

---

### 8.3 `toCents` / `fromCents`

```typescript
import { toCents, fromCents } from '@lynkko/wompi'

toCents(150000)   // 15000000  (COP → centavos)
toCents(99.99)    // 9999      (USD → centavos)

fromCents(15000000)  // 150000  (centavos → COP)
fromCents(9999)      // 99.99
```

**Siempre usa `toCents()`** — no multipliques manualmente. Wompi requiere enteros.

---

### 8.4 `WompiClient` — constructor directo

Si necesitas múltiples instancias (sandbox y producción):

```typescript
import { WompiClient } from '@lynkko/wompi'

const sandboxClient = new WompiClient(
  'pub_test_xxx',
  'prv_test_xxx',
  'eventos_secret',
  true,  // sandbox = true
)

const prodClient = new WompiClient(
  'pub_prod_xxx',
  'prv_prod_xxx',
  'eventos_secret_prod',
  false, // producción
)
```

`createWompiClient()` es el singleton por variables de entorno — úsalo en el 99% de los casos.

---

## 9. Variables de entorno — resumen

Mínimo requerido por proyecto (copiar a `.env.local`):

```bash
# ── Base de datos (Neon) ──────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:pass@ep-xxx-direct.neon.tech/dbname?sslmode=require

# ── Email (Resend) ────────────────────────────────────────────────────
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL="App Name <no-reply@tudominio.co>"

# ── Push notifications (VAPID) ────────────────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BIgTrF...   # empieza con B
VAPID_PRIVATE_KEY=abc123...
VAPID_SUBJECT=mailto:dev@tudominio.co    # opcional

# ── Pagos (Wompi) ─────────────────────────────────────────────────────
WOMPI_PUBLIC_KEY=pub_prod_xxx            # o pub_test_xxx en staging
WOMPI_PRIVATE_KEY=prv_prod_xxx
WOMPI_WEBHOOK_SECRET=events_secret_xxx
# WOMPI_SANDBOX=true                    # solo en staging/dev

# ── Webhooks salientes ────────────────────────────────────────────────
# No requieren env vars — el secreto se guarda en DB por tenant
```

---

## 10. Patrón de App Context

Todos los proyectos Lynkko deben construir un contexto por request que agrupe identidad + DB:

```typescript
// src/lib/context.ts
import { db } from '@/lib/db'

export interface AppContext {
  userId:   string
  tenantId: string
  role:     'admin' | 'member' | 'viewer'
  db:       typeof db
}

/**
 * Construye el contexto desde la sesión.
 * Llámalo al inicio de cada Route Handler o Server Action.
 */
export async function getContext(req?: Request): Promise<AppContext> {
  // Adaptar según el sistema de auth del proyecto
  const session = await getSession(req)

  if (!session?.user) throw new Error('No autenticado')

  return {
    userId:   session.user.id,
    tenantId: session.user.tenantId,
    role:     session.user.role,
    db,
  }
}
```

```typescript
// app/api/leads/route.ts
import { getContext } from '@/lib/context'
import { ok, unauthorized } from '@lynkko/utils'
import { leads } from '@/lib/db/schema'
import { eq, desc } from '@lynkko/db'

export async function GET(req: Request) {
  let ctx
  try { ctx = await getContext(req) }
  catch { return unauthorized() }

  const result = await ctx.db
    .select()
    .from(leads)
    .where(eq(leads.tenantId, ctx.tenantId))  // ← siempre filtrar por tenant
    .orderBy(desc(leads.createdAt))

  return ok(result)
}
```

---

## 11. Notas de migración desde Supabase

### 11.1 Reemplazar `supabase.from().select()`

```typescript
// ❌ Antes (Supabase)
const { data, error } = await supabase
  .from('leads')
  .select('*')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false })

// ✅ Después (Drizzle + @lynkko/db)
const data = await db
  .select()
  .from(leads)
  .where(eq(leads.tenantId, tenantId))
  .orderBy(desc(leads.createdAt))
// No hay `error` — Drizzle lanza excepciones, usar try/catch
```

### 11.2 Reemplazar `supabase.storage`

Supabase Storage → reemplazar con **Vercel Blob** o **Cloudflare R2**.  
No hay un paquete `@lynkko/storage` aún — usar el SDK directamente en cada app.

### 11.3 Reemplazar `supabase.auth`

Ver paquete `@lynkko/auth` (en construcción) para el reemplazo con Better Auth.  
Hasta entonces, usar Better Auth directamente: `pnpm add better-auth`.

### 11.4 Reemplazar `supabase.realtime`

Para features en tiempo real, usar **Server-Sent Events** o **Ably**.  
No hay `@lynkko/realtime` aún.

### 11.5 Variables de entorno a eliminar

```bash
# Remover de .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Convenciones de versionado

| Cambio | Bump |
|--------|------|
| Bug fix, mejora interna | `patch` (0.1.0 → 0.1.1) |
| Nueva función, argumento opcional | `minor` (0.1.0 → 0.2.0) |
| Cambio breaking (rename, tipo distinto) | `major` (0.1.0 → 1.0.0) |

El workflow de GitHub Actions publica automáticamente cuando cambia `packages/**` en `main`.  
Para publicar: actualizar `version` en `package.json` del paquete → commit → push.
