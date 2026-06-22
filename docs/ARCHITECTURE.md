# Lynkko Platform — Arquitectura Técnica

Documentación de referencia del monorepo `lynkko-platform`: 20 paquetes `@lynkko/*` publicados en GitHub Packages (`npm.pkg.github.com`), consumidos por todas las aplicaciones del ecosistema Lynkko.

---

## Índice

1. [Visión general](#1-visión-general)
2. [Estructura del monorepo](#2-estructura-del-monorepo)
3. [Registry — GitHub Packages](#3-registry--github-packages)
4. [Pipeline de build y publicación](#4-pipeline-de-build-y-publicación)
5. [Catálogo de paquetes](#5-catálogo-de-paquetes)
6. [Contratos de API — detalle por paquete](#6-contratos-de-api--detalle-por-paquete)
7. [Patrones transversales](#7-patrones-transversales)
8. [Schemas de base de datos](#8-schemas-de-base-de-datos)
9. [Integración en una app Next.js](#9-integración-en-una-app-nextjs)
10. [Variables de entorno — referencia completa](#10-variables-de-entorno--referencia-completa)
11. [Aplicaciones del ecosistema](#11-aplicaciones-del-ecosistema)
12. [Bundles del ecosistema](#12-bundles-del-ecosistema)
13. [Agente Comercial IA — especificación técnica](#13-agente-comercial-ia--especificación-técnica)
14. [Modelo de datos PEC — campos y pipeline](#14-modelo-de-datos-pec--campos-y-pipeline)

---

## 1. Visión general

### 1.1 Propósito

`lynkko-platform` es una **librería de infraestructura compartida** para el ecosistema Lynkko de SaaS B2B para LATAM. No es una aplicación desplegable — es la capa de paquetes que todas las apps consumen.

```
github.com/Lynkko/lynkko-platform
├── packages/               ← 20 @lynkko/* packages
└── docs/                   ← esta documentación
```

**Lynkko Ecosystem OS v0.4** posiciona a Lynkko como la **capa de operación para el éxito comercial en LATAM**: prospección, ejecución de ventas, incentivos internos, comunicación con clientes, membresías y fidelización, centros de ayuda, y cumplimiento de facturación electrónica.

> *"Lynkko ayuda a negocios en LATAM a vender más con menos desorden."*

El ecosistema opera en dos mundos comerciales:
- **Enterprise / equipos medianos y grandes:** Lynkko App, Incentivos, Customer, ClubPass, Help, Facturación.
- **Pequeños negocios:** Turnflow, ClubPass, Facturación, y Help en casos específicos.

Cada producto puede venderse de forma independiente, pero los productos conectados incrementan el valor total del ecosistema.

### 1.2 Ecosistema de aplicaciones

Ocho apps consumen estos paquetes. Cada app es un repo Next.js independiente:

| App ID         | Nombre comercial          | Repo                           | Working definition (OS v0.4) |
|----------------|---------------------------|--------------------------------|------------------------------|
| `pec`          | Lynkko App                | `Lynkko/lynkko-app`           | Ejecución comercial, visibilidad del proceso de ventas y actividad del equipo en tiempo real. **Plataforma de Éxito Comercial, no un CRM tradicional.** |
| `admin`        | Lynkko Superadmin         | `Lynkko/lynkko-platform-admin`| Administración de tenants, apps habilitadas, temas, módulos y billing. Acceso exclusivo del equipo Lynkko. |
| `incentivos`   | Lynkko Incentivos         | `Lynkko/lynkko-incentivos`    | Motivación, reconocimiento, gamificación, puntos, metas y programas de incentivos para **equipos internos** (no clientes externos). |
| `turnflow`     | Turnflow by Lynkko        | `Lynkko/lynkko-turnflow`      | SaaS simple y verticalizado para negocios locales: clientes, reservas, pedidos, turnos y seguimiento de prospectos. |
| `clubpass`     | ClubPass by Lynkko        | `gvelasquez85/clubpass`       | Membresías, fidelización y beneficios para **clientes externos**: clubes, recurrencia, beneficios y redemptions. |
| `customer`     | Lynkko Customer           | *(pendiente)*                 | Gestión de solicitudes, PQRS y casos con trazabilidad interna y visibilidad externa para el cliente. |
| `help`         | Lynkko Help               | *(pendiente)*                 | Centro de ayuda, FAQs, documentación y base de conocimiento self-service. |
| `facturacion`  | Lynkko Facturación        | *(pendiente)*                 | Facturación electrónica DIAN (Colombia) desde CSV, API, sistemas existentes o eventos del ecosistema. |

> **Distinción clave:** Incentivos reconoce equipos internos; ClubPass reconoce clientes externos. Son productos complementarios, no sustitutos.

### 1.3 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Build | tsup (CJS + ESM + DTS) |
| Runtime | Node.js 18+ (fetch nativo) |
| Base de datos | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| UI | React 18 + Radix UI + Tailwind CSS |
| Email | Resend |
| Push | Web Push API (VAPID) |
| Pagos | Wompi (Colombia) |
| AI | OpenAI SDK |
| Registro | GitHub Packages (`npm.pkg.github.com`) |

---

## 2. Estructura del monorepo

```
lynkko-platform/
├── packages/
│   ├── utils/            # L1 — Foundation
│   ├── db/               # L1 — Foundation
│   ├── auth/             # L2 — Auth & Security
│   ├── api-keys/         # L2 — Auth & Security
│   ├── email/            # L3 — Communication
│   ├── push/             # L3 — Communication
│   ├── webhooks/         # L3 — Communication
│   ├── notifications/    # L3 — Communication
│   ├── wompi/            # L4 — Payments
│   ├── billing/          # L4 — Payments
│   ├── currency/         # L5 — Localization
│   ├── i18n/             # L5 — Localization
│   ├── dian/             # L5 — Localization
│   ├── qr/               # L5 — Localization
│   ├── ai/               # L6 — Vertical
│   ├── wallets/          # L6 — Vertical
│   ├── audit/            # L6 — Vertical
│   ├── platform/         # L7 — Ecosystem
│   ├── offline-sync/     # L7 — Ecosystem
│   └── ui/               # L7 — Ecosystem
├── docs/
│   ├── ARCHITECTURE.md   ← este archivo
│   └── CONSUMING.md      ← guía de consumo (primeros 8 paquetes)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 2.1 Dependencias entre paquetes

Existe **exactamente una** dependencia inter-paquete:

```
@lynkko/ui → @lynkko/i18n
```

`@lynkko/ui` usa `getInitials()` de `@lynkko/i18n` para el componente `UserAvatar`.

**Todos los demás paquetes son independientes** entre sí. No hay árbol de dependencias complejas.

> **Nota de diseño:** `AppTheme` se define de forma idéntica en `@lynkko/ui` **y** `@lynkko/platform`.
> TypeScript structural typing garantiza compatibilidad. Esta duplicación intencional evita
> que `@lynkko/ui` dependa de `@lynkko/platform` (que tiene drizzle-orm como peer dep).

### 2.2 turbo.json — orden de build

```json
{
  "tasks": {
    "build": {
      "outputs": ["dist/**"],
      "dependsOn": ["^build"]   // ← builds dependencias primero
    }
  }
}
```

Turborepo detecta que `@lynkko/ui` depende de `@lynkko/i18n` y construye i18n antes.
Los demás paquetes se buildean en paralelo.

---

## 3. Registry — GitHub Packages

### 3.1 Separación de responsabilidades

Los paquetes `@lynkko/*` se publican en **GitHub Packages** (`npm.pkg.github.com`), que es propio
del ecosistema Lynkko. Los paquetes públicos de terceros (`tailwindcss`, `react`, `drizzle-orm`, etc.)
siguen viniendo de npmjs.org — esto es inevitable sin infraestructura adicional, y en la práctica
npmjs.org tiene uptime del 99.99%.

```
pnpm install en una app consumidora:
  @lynkko/*      → npm.pkg.github.com  (GitHub Packages — tu registry)
  tailwindcss, react, drizzle-orm, ... → registry.npmjs.org  (estándar industria)
```

### 3.2 Causa de los errores `ERR_INVALID_THIS`

El error venía de dos fuentes combinadas:

**1. `@lynkko/*` resolviendo a npmjs.org**
El `.npmrc` de la app consumidora no tenía `@lynkko:registry` configurado, por lo que pnpm
buscaba esos paquetes en npmjs.org (donde no existen o no tienen acceso).

**2. `ERR_INVALID_THIS` en cascada**
pnpm **no expande variables de entorno** en `.npmrc` de proyecto. Si el `.npmrc` tenía:
```ini
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
…y `${GITHUB_TOKEN}` no estaba expandido, pnpm mandaba un header de auth malformado.
Esto no solo falla para GitHub Packages — corrompe el cliente HTTP de pnpm para TODOS
los registries, incluido npmjs.org. De ahí que aparecieran errores hasta en `tailwindcss`.

### 3.3 Solución: el token no va en `.npmrc` del repo

El `.npmrc` commiteado en el repo solo declara **dónde** están los paquetes, no el token:

```ini
# .npmrc  (commiteado en lynkko-platform Y en cada app consumidora)
@lynkko:registry=https://npm.pkg.github.com
```

El token se inyecta en el entorno de ejecución — nunca en el archivo:

**En local** (`~/.npmrc` de cada dev — no se commitea):
```ini
//npm.pkg.github.com/:_authToken=ghp_TU_PAT_AQUI
```

**En Vercel** (Install Command override en cada proyecto):
```bash
echo "//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" >> ~/.npmrc && pnpm install --frozen-lockfile
```
`GITHUB_TOKEN` se agrega como variable de entorno en Vercel (Settings → Environment Variables).
Usar un **PAT clásico** con scope `read:packages` de la org Lynkko.

**En GitHub Actions**:
```yaml
- name: Setup pnpm auth
  run: echo "//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}" >> ~/.npmrc
```
`GITHUB_TOKEN` en Actions ya tiene `read:packages` automáticamente cuando el repo es de la misma org.

### 3.4 PAT para leer paquetes — configuración

Generar un **Personal Access Token (Classic)** en GitHub:
- Settings → Developer settings → Personal access tokens → Tokens (classic)
- Scope requerido: `read:packages`
- El token de publicación necesita además: `write:packages`

Agregar en cada destino:
| Destino | Variable | Scope del token |
|---------|----------|-----------------|
| `~/.npmrc` local (cada dev) | hardcoded | `read:packages` |
| Vercel (cada proyecto) | `GITHUB_TOKEN` | `read:packages` |
| GitHub Actions publish | `secrets.GITHUB_TOKEN` | automático (org) |

---

## 4. Pipeline de build y publicación

### 4.1 Build local

```bash
# Build todos los paquetes en orden
pnpm turbo build

# Build un paquete específico
pnpm --filter @lynkko/ui build

# Watch mode (desarrollo)
pnpm --filter @lynkko/ui dev
```

Cada paquete usa **tsup** configurado para generar:
- `dist/index.js` — CJS (CommonJS)
- `dist/index.mjs` — ESM
- `dist/index.d.ts` — TypeScript declarations

### 4.2 Estructura de `package.json` por paquete

```json
{
  "name": "@lynkko/<name>",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "publishConfig": {
    "registry": "https://registry.lynkko.co",
    "access": "public"
  }
}
```

### 4.3 GitHub Actions — CI/CD de publicación

Archivo: `.github/workflows/publish.yml`

```yaml
name: Publish packages

on:
  push:
    branches: [main]
    paths: ['packages/**']

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write   # necesario para publicar en GitHub Packages

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Inject auth token
        run: echo "//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}" >> ~/.npmrc

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm turbo build

      - name: Publish changed packages
        run: |
          for pkg in packages/*/; do
            cd "$pkg"
            pnpm publish --no-git-checks 2>/dev/null || true
            cd ../..
          done
```

> El token se inyecta en `~/.npmrc` del runner (nunca en el `.npmrc` del repo).
> `secrets.GITHUB_TOKEN` en GitHub Actions tiene `write:packages` automáticamente
> cuando el workflow tiene `permissions.packages: write`.

### 3.4 Versionado

| Cambio | Bump |
|--------|------|
| Bug fix, mejora interna | `patch` (0.1.x) |
| Nueva función, argumento opcional | `minor` (0.x.0) |
| Breaking: rename, tipo distinto, remoción | `major` (x.0.0) |

Para publicar: editar `version` en `package.json` del paquete → commit → push a `main`.

---

## 4. Catálogo de paquetes

### L1 — Foundation

| Paquete | Descripción | Peer deps |
|---------|-------------|-----------|
| `@lynkko/utils` | cn(), formatters, HTTP helpers, type guards | `next >= 15` (opcional) |
| `@lynkko/db` | createDb(), operadores Drizzle re-exportados, conexión Neon | `drizzle-orm` |

### L2 — Auth & Security

| Paquete | Descripción | Peer deps |
|---------|-------------|-----------|
| `@lynkko/auth` | Factory de Better Auth con Drizzle adapter + schema | `better-auth`, `drizzle-orm` |
| `@lynkko/api-keys` | Generación/validación de API keys con prefijo y hash | — |

### L3 — Communication

| Paquete | Descripción | Peer deps |
|---------|-------------|-----------|
| `@lynkko/email` | sendEmail/sendEmailOrThrow vía Resend + template base | — |
| `@lynkko/push` | Web Push VAPID — sendPush/sendPushToMany | — |
| `@lynkko/webhooks` | HMAC-SHA256 sign/verify + dispatch outbound | — |
| `@lynkko/notifications` | In-app notifications (DB) + SSE stream | `drizzle-orm` |

### L4 — Payments

| Paquete | Descripción | Peer deps |
|---------|-------------|-----------|
| `@lynkko/wompi` | Cliente Wompi Colombia — tokenización, cobro, webhooks | — |
| `@lynkko/billing` | Plan registry, límites de uso, utilidades de billing | — |

### L5 — Localization

| Paquete | Descripción | Peer deps |
|---------|-------------|-----------|
| `@lynkko/currency` | Formateo monetario multi-moneda LATAM (COP/USD/MXN/EUR…) | — |
| `@lynkko/i18n` | Fechas, teléfonos, documentos CO/MX/US, capitalizeName, getInitials | `date-fns >= 3` |
| `@lynkko/dian` | Utilidades facturación electrónica Colombia (CUFE, NIT, IVA) | — |
| `@lynkko/qr` | SVG/PNG/DataURL desde URL o datos — QR para miembros y citas | `qrcode >= 1.5` |

### L6 — Vertical

| Paquete | Descripción | Peer deps |
|---------|-------------|-----------|
| `@lynkko/ai` | Copiloto con rate limiting por plan, streaming, historial | `openai` |
| `@lynkko/wallets` | Apple Wallet (PKPass) y Google Wallet (JWT) para membresías | `passkit-generator`, `jsonwebtoken` |
| `@lynkko/audit` | Logs de auditoría con schema Drizzle + queryable client | `drizzle-orm` |

### L7 — Ecosystem

| Paquete | Descripción | Peer deps |
|---------|-------------|-----------|
| `@lynkko/platform` | SDK de acceso y temas por tenant/app — PlatformClient | `drizzle-orm` |
| `@lynkko/offline-sync` | MutationQueue (localStorage) + OfflineSyncProvider + Dexie | `react >= 18`, `dexie` |
| `@lynkko/ui` | Design system completo: tokens, primitivos Radix, componentes dominio | `react >= 18`, `tailwindcss >= 3` |

---

## 5. Contratos de API — detalle por paquete

### 5.1 `@lynkko/utils`

```typescript
// Merge de clases CSS (clsx + tailwind-merge)
cn(...inputs: ClassValue[]): string

// Formatters
formatCurrency(amount: number, currency?: 'COP'|'USD'|'EUR'): string
formatPoints(points: number): string
formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string
formatRelativeTime(date: Date): string  // "Hace 5 min"

// HTTP helpers (devuelven NextResponse)
ok(data?: unknown): NextResponse                      // 200
created(data?: unknown): NextResponse                 // 201
badRequest(msg?: string, details?: unknown): NextResponse  // 400
unauthorized(msg?: string): NextResponse              // 401
forbidden(msg?: string): NextResponse                 // 403
notFound(msg?: string): NextResponse                  // 404
conflict(msg?: string): NextResponse                  // 409
serverError(msg?: string): NextResponse               // 500

// Utilidades
slugify(text: string): string
generateId(prefix?: string): string   // "lead_k3x9m2p7"
sleep(ms: number): Promise<void>
pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>
omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>

// Type guards
isDefined<T>(value: T | null | undefined): value is T
isString(value: unknown): value is string
```

---

### 5.2 `@lynkko/db`

```typescript
// Conexión pooled (Neon serverless)
createDb<T extends Record<string, unknown>>(schema: T): DrizzleDb<T>

// Conexión directa (para migraciones sin PgBouncer)
createDbDirect<T>(schema: T): DrizzleDb<T>

// Tipo base (sin schema)
type LynkkoDb

// Re-exports de drizzle-orm (selección curada)
export { eq, ne, gt, gte, lt, lte, and, or, not,
         isNull, isNotNull, inArray, notInArray,
         like, ilike, between, sql,
         asc, desc, count, sum, avg, max, min,
         type InferSelectModel, type InferInsertModel }
```

**Variables de entorno:**
```
DATABASE_URL          # Conexión pooled
DATABASE_URL_UNPOOLED # Conexión directa (migraciones)
```

---

### 5.3 `@lynkko/auth`

```typescript
interface LynkkoAuthOptions {
  db: DrizzleDb
  appName: string
  appUrl: string
  secret: string
  sendResetPassword?: (
    data: { token: string; url: string; user: { email: string; name: string } },
    req?: Request,
  ) => Promise<void>
  sendVerificationEmail?: (
    data: { user: { email: string; name: string }; url: string; token: string },
    req?: Request,
  ) => Promise<void>
}

createLynkkoAuth(options: LynkkoAuthOptions): BetterAuth

// Schema Drizzle (tablas que la app debe migrar)
export { users, sessions, accounts, verifications }
```

**Uso:**
```typescript
// src/lib/auth.ts
import { createLynkkoAuth } from '@lynkko/auth'
import { db } from './db'

export const auth = createLynkkoAuth({
  db, appName: 'Turnflow', appUrl: 'https://turnflow.co',
  secret: process.env.AUTH_SECRET!,
  sendResetPassword: async ({ url, user }) =>
    sendEmail({ to: user.email, subject: 'Recuperar contraseña', html: `<a href="${url}">Reset</a>` }),
})

// app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'
export const { GET, POST } = auth.handler
```

---

### 5.4 `@lynkko/api-keys`

```typescript
// Generar API key con prefijo visible
generateApiKey(prefix?: string): { key: string; hash: string; prefix: string }
// key:    "lk_k3x9m2p7abc..."  (mostrar una vez al usuario)
// hash:   SHA-256 del key       (guardar en DB)
// prefix: "lk_k3x9"            (mostrar para identificar en UI)

// Validar key contra hash almacenado
validateApiKey(key: string, storedHash: string): Promise<boolean>

// Extraer prefijo (para búsqueda en DB)
getKeyPrefix(key: string): string
```

---

### 5.5 `@lynkko/email`

```typescript
interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string      // default: RESEND_FROM_EMAIL
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  tags?: Array<{ name: string; value: string }>
}

interface EmailResult {
  success: boolean
  id?: string     // Resend ID
  error?: string
}

sendEmail(options: SendEmailOptions): Promise<EmailResult>
sendEmailOrThrow(options: SendEmailOptions): Promise<string>  // lanza si falla

// Template base de marca
lynkkoEmailTemplate(options: {
  title: string
  content: string
  primaryColor?: string    // default: '#166534'
  logoUrl?: string
  footerText?: string
  ctaText?: string
  ctaUrl?: string
}): string
```

---

### 5.6 `@lynkko/push`

```typescript
interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  renotify?: boolean
  data?: Record<string, unknown>
}

interface PushResult {
  success: boolean
  endpoint: string
  error?: string
  expired?: boolean  // true → eliminar de DB (HTTP 404/410)
}

sendPush(subscription: PushSubscription, payload: PushPayload): Promise<PushResult>
sendPushToMany(subs: PushSubscription[], payload: PushPayload): Promise<PushResult[]>
generateVapidKeys(): { publicKey: string; privateKey: string }
```

---

### 5.7 `@lynkko/webhooks`

```typescript
signWebhook(secret: string, body: string, timestamp: number): string
// → "sha256=a3f9..."

verifyWebhook(
  secret: string,
  body: string,
  signature: string,
  timestamp: number,
  toleranceMs?: number,   // default: 5 * 60 * 1000
): boolean

webhookHeaders(
  secret: string,
  body: string,
  event: string,
): Record<string, string>
// → { 'X-Lynkko-Signature', 'X-Lynkko-Event', 'X-Lynkko-Timestamp', 'Content-Type' }

interface DispatchResult {
  url: string
  success: boolean
  statusCode?: number
  error?: string
}

dispatchWebhook(
  endpoint: { url: string; secret: string; events?: string[] },
  event: string,
  data: unknown,
  timeoutMs?: number,     // default: 8000
): Promise<DispatchResult>

dispatchWebhookToMany(
  endpoints: Array<{ url: string; secret: string; events?: string[] }>,
  event: string,
  data: unknown,
  timeoutMs?: number,
): Promise<DispatchResult[]>
```

---

### 5.8 `@lynkko/notifications`

```typescript
// ─── In-app notifications (DB) ────────────────────────────────────────────────

interface NotificationEntry {
  tenantId: string
  userId: string
  title: string
  body?: string
  type?: string       // 'info' | 'success' | 'warning' | 'error' | 'lead' | ...
  link?: string
  meta?: Record<string, unknown>
}

// createNotificationService(db) → NotificationService
const svc = createNotificationService(db)
await svc.create(entry)                        // → Notification
await svc.markRead(id)
await svc.markAllRead(tenantId, userId)
await svc.get(tenantId, userId, limit?, offset?)  // → Notification[]
await svc.countUnread(tenantId, userId)        // → number
await svc.purge(olderThan: Date)               // → deletedCount: number

// ─── SSE stream (Server-Sent Events) ──────────────────────────────────────────

interface SseStream {
  stream: ReadableStream
  send(payload: unknown): void
  close(): void
}

createSseStream(): SseStream

// Constantes
NOTIFICATION_TYPES: {
  INFO: 'info', SUCCESS: 'success', WARNING: 'warning', ERROR: 'error',
  LEAD: 'lead', INVOICE: 'invoice', PAYMENT: 'payment',
  TASK: 'task', MENTION: 'mention', SYSTEM: 'system',
}
```

**Uso SSE (Route Handler):**
```typescript
// app/api/notifications/stream/route.ts
export async function GET() {
  const { stream, send } = createSseStream()
  // enviar eventos cuando ocurra algo...
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
```

---

### 5.9 `@lynkko/wompi`

```typescript
// ─── Client ───────────────────────────────────────────────────────────────────

createWompiClient(): WompiClient  // singleton por env vars

class WompiClient {
  constructor(
    publicKey: string, privateKey: string,
    webhookSecret: string, sandbox?: boolean,
  )

  getAcceptanceTokens(): Promise<{ acceptanceToken: string; personalDataToken: string }>

  createPaymentSource(
    cardToken: string,
    acceptanceToken: string,
    personalDataToken: string,
    email: string,
  ): Promise<WompiPaymentSource>

  charge(options: WompiChargeOptions): Promise<WompiTransaction>

  getTransaction(id: string): Promise<WompiTransaction>

  verifyWebhookSignature(body: string, checksum: string): boolean
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WompiChargeOptions {
  paymentSourceId: number
  amountInCents: number
  currency: 'COP' | 'USD'
  reference: string
  customerEmail: string
  redirectUrl?: string
  installments?: number
}

interface WompiTransaction {
  id: string
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR'
  amountInCents: number
  currency: string
  reference: string
  paymentMethodType: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

toCents(amount: number): number    // 150000 COP → 15000000
fromCents(cents: number): number   // 15000000 → 150000

class WompiError extends Error {
  statusCode: number
}
```

---

### 5.10 `@lynkko/billing`

Registry genérico de planes — sin planes hardcoded. Cada app define los suyos con `definePlan()` y los registra en `PlanRegistry`.

```typescript
// ─── Types ───────────────────────────────────────────────────────────────────

type LimitValue = number | 'unlimited'
type PlanLimits = Record<string, LimitValue>

interface PlanPrice {
  monthly:  number
  annual?:  number
  currency: 'COP' | 'USD'
}

interface Plan {
  id:          string       // 'free' | 'starter' | 'pro' | lo que defina la app
  name:        string
  tier:        number       // 0 = más bajo. Permite comparar planes sin strings
  description?: string
  features:    PlanLimits   // { leads: 100, users: 1, ai_requests: 20, ... }
  price?:      PlanPrice
}

interface LimitCheckResult {
  allowed:   boolean
  limit:     LimitValue
  remaining: LimitValue
  percent:   number         // 0-100
}

// ─── Factory ─────────────────────────────────────────────────────────────────

definePlan(plan: Plan): Plan   // identity + tipado; documenta la forma

// ─── Utilidades de límites ────────────────────────────────────────────────────

getLimit(plan: Plan, feature: string): LimitValue
isWithinLimit(plan: Plan, feature: string, usage: number): boolean
checkFeatureLimit(plan: Plan, feature: string, currentUsage: number): LimitCheckResult
hasFeatureAccess(plan: Plan, feature: string): boolean

// ─── Comparación ──────────────────────────────────────────────────────────────

comparePlans(planA: Plan, planB: Plan): -1 | 0 | 1
isHigherPlan(planA: Plan, planB: Plan): boolean

// ─── PlanRegistry ─────────────────────────────────────────────────────────────

class PlanRegistry {
  register(...plans: Plan[]): this
  get(id: string): Plan | undefined
  getOrThrow(id: string): Plan
  getAll(): Plan[]
  getOrdered(): Plan[]        // asc por tier
  getHighest(): Plan
  getLowest(): Plan
  has(id: string): boolean
  size(): number
}
```

**Uso típico:**
```typescript
// src/lib/plans.ts  (en cada app)
import { PlanRegistry, definePlan } from '@lynkko/billing'

export const plans = new PlanRegistry()

plans.register(
  definePlan({ id: 'free',       name: 'Gratis',    tier: 0,
               features: { leads: 100, users: 1, ai_requests: 0 } }),
  definePlan({ id: 'starter',    name: 'Starter',   tier: 1,
               features: { leads: 500, users: 3, ai_requests: 20 },
               price: { monthly: 79000, annual: 69000, currency: 'COP' } }),
  definePlan({ id: 'pro',        name: 'Pro',       tier: 2,
               features: { leads: 'unlimited', users: 10, ai_requests: 200 },
               price: { monthly: 199000, annual: 169000, currency: 'COP' } }),
  definePlan({ id: 'enterprise', name: 'Enterprise', tier: 3,
               features: { leads: 'unlimited', users: 'unlimited', ai_requests: 'unlimited' } }),
)

// En un Route Handler:
const plan = plans.getOrThrow(tenant.plan)
if (!isWithinLimit(plan, 'leads', leadsCount)) return conflict('Límite de leads alcanzado')

const check = checkFeatureLimit(plan, 'leads', leadsCount)
// { allowed: true, limit: 500, remaining: 13, percent: 97 }
if (check.percent >= 90) await sendLimitWarningEmail(user)
```

---

### 5.11 `@lynkko/currency`

```typescript
type CurrencyCode = 'COP' | 'USD' | 'MXN' | 'EUR' | 'PEN' | 'CLP' | 'ARS' | 'BRL'

interface FormatOptions {
  symbol?: boolean    // default: true
  showCode?: boolean  // default: false
  decimals?: number   // override CURRENCY_CONFIG.decimals
  compact?: boolean   // 1.5M, 150K
}

CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; locale: string; decimals: number }>

formatCurrency(amount: number, currency: CurrencyCode, options?: FormatOptions): string
formatAmount(amount: number, currency: CurrencyCode): string   // solo número
getCurrencySymbol(currency: CurrencyCode): string

toCents(amount: number, currency: CurrencyCode): number
fromCents(cents: number, currency: CurrencyCode): number

parseCurrency(value: string): number   // maneja "1.500,50" y "1,500.50"
sumAmounts(amounts: number[], currency: CurrencyCode): number  // sin errores float
```

---

### 5.12 `@lynkko/i18n`

```typescript
type DateStyle = 'short' | 'long' | 'full' | 'time' | 'custom'
type PhoneCountry = 'CO' | 'MX' | 'US' | 'ES' | 'PE' | 'CL' | 'AR' | 'BR'

// Fechas
formatDate(date: Date | string, style?: DateStyle, customFormat?: string): string
formatRelativeDate(date: Date | string): string       // "hace 3 minutos"
formatRelativeTo(date: Date | string, base: Date): string  // "mañana a las 10:30"
formatTime(date: Date | string, use12h?: boolean): string  // "14:30"
startOfToday(): Date

// Documentos Colombia
formatNit(nit: string, dv?: string): string           // "900.455.751-5"
formatCedula(cedula: string): string                  // "1.234.567.890"
formatDocument(value: string, type: 'nit'|'cedula'|'passport'|'ce'|'nite', dv?: string): string

// Teléfonos
formatPhone(phone: string, country?: PhoneCountry): string  // "+57 310 123 4567"
normalizePhone(phone: string): string                 // solo dígitos con prefijo

// Nombres
capitalizeName(name: string): string                  // Unicode-aware title case
getInitials(name: string): string                     // "JG" (máx 2 chars)
```

---

### 5.13 `@lynkko/dian`

```typescript
// NIT y verificación
formatNit(nit: string): string                        // "900.455.751"
calculateDv(nit: string): string                      // dígito de verificación
validateNit(nit: string, dv: string): boolean

// Facturación electrónica
generateCufe(invoice: {
  number: string; date: string; time: string;
  amount: number; taxAmount: number;
  taxCode: string; nit: string; nitDian: string;
  softwarePin: string;
}): string    // CUFE SHA-384

// IVA
IVA_RATE: 0.19
calculateIva(subtotal: number): number
addIva(subtotal: number): number

// Tipos de documento
DOCUMENT_TYPES: Record<string, string>  // '13': 'Cédula de ciudadanía', etc.

// Códigos de impuesto
TAX_CODES: { IVA: '01', INC: '04', ICA: '03' }
```

---

### 5.14 `@lynkko/qr`

```typescript
interface QrOptions {
  size?: number         // default: 300 (px)
  margin?: number       // default: 2
  color?: string        // default: '#000000'
  bgColor?: string      // default: '#ffffff'
  errorLevel?: 'L' | 'M' | 'Q' | 'H'  // default: 'M'
}

generateQrSvg(data: string, options?: QrOptions): Promise<string>
generateQrBuffer(data: string, options?: QrOptions): Promise<Buffer>
generateQrDataUrl(data: string, options?: QrOptions): Promise<string>  // data:image/png;base64,...

// Helpers de dominio
generateMemberQr(baseUrl: string, tenantId: string, memberId: string, options?: QrOptions): Promise<string>
// URL: ${baseUrl}/member/${tenantId}/${memberId}

generateAppointmentQr(baseUrl: string, appointmentId: string, options?: QrOptions): Promise<string>
// URL: ${baseUrl}/appointment/${appointmentId}
```

---

### 5.15 `@lynkko/ai`

```typescript
interface AiCopilotOptions {
  apiKey: string
  model?: string              // default: 'gpt-4o-mini'
  systemPrompt?: string
  maxTokens?: number          // default: 1000
  planId?: PlanId             // para rate limiting
  rateLimitPerMinute?: number // default: 10
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface CompletionResult {
  text: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
}

createAiCopilot(options: AiCopilotOptions): AiCopilot

class AiCopilot {
  complete(messages: ChatMessage[]): Promise<CompletionResult>
  stream(messages: ChatMessage[]): AsyncIterable<string>
  isRateLimited(tenantId: string): boolean
}
```

---

### 5.16 `@lynkko/wallets`

```typescript
// Apple Wallet (PKPass)
interface PkPassConfig {
  teamId: string
  passTypeId: string
  wwdr: Buffer
  signerCert: Buffer
  signerKey: Buffer
  passphrase?: string
}

interface PassData {
  serialNumber: string
  description: string
  memberName: string
  memberId: string
  memberSince: string
  expiresAt?: string
  logoUrl?: string
  backgroundColor?: string
  foregroundColor?: string
}

generateApplePass(config: PkPassConfig, data: PassData): Promise<Buffer>

// Google Wallet (JWT)
interface GoogleWalletConfig {
  issuerId: string
  serviceAccountEmail: string
  serviceAccountKey: string
}

generateGooglePassJwt(config: GoogleWalletConfig, data: PassData): string
getGooglePassUrl(jwt: string): string
```

---

### 5.17 `@lynkko/audit`

```typescript
interface AuditEntry {
  tenantId: string
  userId?: string
  action: string           // usar AUDIT_ACTIONS.*
  resource: string         // 'lead' | 'invoice' | 'user' | ...
  resourceId?: string
  meta?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

interface AuditQuery {
  tenantId: string
  userId?: string
  action?: string
  resource?: string
  resourceId?: string
  from?: Date
  to?: Date
  limit?: number           // default: 50
  offset?: number
}

createAuditLogger(db: DrizzleDb): {
  log(entry: AuditEntry): Promise<void>
  query(filters: AuditQuery): Promise<AuditLog[]>
  purge(olderThan: Date): Promise<number>  // → deletedCount
}

// Constantes de acciones predefinidas
AUDIT_ACTIONS: {
  USER_LOGIN: 'user.login', USER_LOGOUT: 'user.logout',
  USER_CREATED: 'user.created', USER_UPDATED: 'user.updated',
  LEAD_CREATED: 'lead.created', LEAD_UPDATED: 'lead.updated',
  LEAD_DELETED: 'lead.deleted', LEAD_CONVERTED: 'lead.converted',
  INVOICE_CREATED: 'invoice.created', INVOICE_SENT: 'invoice.sent',
  INVOICE_PAID: 'invoice.paid', INVOICE_VOIDED: 'invoice.voided',
  PAYMENT_PROCESSED: 'payment.processed', PAYMENT_FAILED: 'payment.failed',
  SETTING_UPDATED: 'setting.updated', MEMBER_ENROLLED: 'member.enrolled',
  MEMBER_EXPIRED: 'member.expired', APPOINTMENT_BOOKED: 'appointment.booked',
  APPOINTMENT_CANCELLED: 'appointment.cancelled', API_KEY_CREATED: 'api_key.created',
}
```

---

### 5.18 `@lynkko/platform`

SDK completo del ecosistema: control de acceso, gestión de tenants, planes, suscripciones, facturación interna y métricas.

```typescript
// ─── App IDs ─────────────────────────────────────────────────────────────────

const LYNKKO_APPS = {
  PEC: 'pec', TURNFLOW: 'turnflow', CLUBPASS: 'clubpass',
  INCENTIVOS: 'incentivos', PQRS: 'pqrs', HELP: 'help',
} as const
type LynkkoAppId = typeof LYNKKO_APPS[keyof typeof LYNKKO_APPS]

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppTheme {
  primary: string
  secondary?: string; accent?: string; appName?: string
  logoUrl?: string; faviconUrl?: string
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

type TenantStatus       = 'trial' | 'active' | 'suspended' | 'churned'
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused'
type InvoiceStatus      = 'draft' | 'open' | 'paid' | 'void'

interface TenantAppSummary {
  appId:     LynkkoAppId
  isEnabled: boolean
  theme?:    AppTheme
  config?:   Record<string, unknown>
}

interface CreateTenantInput {
  name: string; slug: string; country?: string; timezone?: string
  contactEmail?: string; contactPhone?: string; logoUrl?: string
  status?: TenantStatus; trialEndsAt?: Date; notes?: string
}

interface CreatePlanInput {
  appId: string; slug: string; name: string; description?: string
  monthlyPrice: number; annualPrice: number; currency?: string
  maxSeats?: number; features?: string[]
  isPublic?: boolean; sortOrder?: number; isActive?: boolean
}

interface InvoiceItemInput {
  appId?: string; subscriptionId?: string; description: string
  quantity?: number; unitPrice: number
}

interface SubscriptionWithPlan {
  id: string; tenantId: string; appId: string; status: string; seats: number
  currentPeriodStart: Date; currentPeriodEnd: Date
  trialEnd: Date | null; cancelAtPeriodEnd: boolean; canceledAt: Date | null
  plan: { id: string; name: string; slug: string; monthlyPrice: number; annualPrice: number; currency: string }
}

interface MarketplaceItem {
  appId: LynkkoAppId; name: string; description?: string | null; url?: string | null
  plans: AppPlan[]
  currentSubscription: { status: string; planName: string; seats: number; currentPeriodEnd: Date } | null
  isEnabled: boolean
}

interface TopTenantStat { tenantId: string; mrr: number; subscriptionCount: number }

// ─── SDK ──────────────────────────────────────────────────────────────────────

createPlatformClient(db: DrizzleDb): PlatformClient

interface PlatformClient {
  // ── Access control ──────────────────────────────────────────────────────────
  isAppEnabled(tenantId: string, appId: LynkkoAppId): Promise<boolean>
  isModuleEnabled(tenantId: string, appId: LynkkoAppId, moduleSlug: string): Promise<boolean>
  getAppTheme(tenantId: string, appId: LynkkoAppId): Promise<AppTheme | null>
  getTenantApps(tenantId: string): Promise<TenantAppSummary[]>
  enableApp(tenantId: string, appId: LynkkoAppId, config?: { theme?: AppTheme; config?: Record<string, unknown> }): Promise<void>
  disableApp(tenantId: string, appId: LynkkoAppId): Promise<void>
  updateTheme(tenantId: string, appId: LynkkoAppId, theme: AppTheme): Promise<void>
  setModuleAccess(tenantId: string, appId: LynkkoAppId, moduleSlug: string, enabled: boolean): Promise<void>

  // ── Tenants ─────────────────────────────────────────────────────────────────
  listTenants(): Promise<Tenant[]>
  getTenant(id: string): Promise<Tenant | null>
  createTenant(data: CreateTenantInput): Promise<Tenant>
  updateTenant(id: string, data: Partial<CreateTenantInput>): Promise<void>

  // ── Plans (catálogo por app) ─────────────────────────────────────────────────
  listPlans(appId?: string): Promise<AppPlan[]>
  createPlan(data: CreatePlanInput): Promise<AppPlan>
  updatePlan(id: string, data: Partial<CreatePlanInput>): Promise<void>

  // ── Subscriptions ───────────────────────────────────────────────────────────
  getSubscription(tenantId: string, appId: LynkkoAppId): Promise<SubscriptionWithPlan | null>
  listSubscriptions(tenantId: string): Promise<SubscriptionWithPlan[]>
  createSubscription(tenantId: string, appId: LynkkoAppId, planId: string, opts?: { seats?: number }): Promise<Subscription>
  cancelSubscription(subscriptionId: string): Promise<void>

  // ── Invoices ────────────────────────────────────────────────────────────────
  listInvoices(tenantId: string): Promise<Invoice[]>
  createInvoice(tenantId: string, items: InvoiceItemInput[], opts?: { currency?: string; tax?: number; notes?: string; dueDate?: Date }): Promise<Invoice>
  markInvoicePaid(invoiceId: string, wompiTransactionId: string, paymentMethod?: Record<string, unknown>): Promise<void>

  // ── Usage ───────────────────────────────────────────────────────────────────
  recordUsage(tenantId: string, appId: LynkkoAppId, metric: string, value: number, period?: string): Promise<void>
  getUsageSummary(tenantId: string): Promise<UsageRecord[]>

  // ── Marketplace ─────────────────────────────────────────────────────────────
  getMarketplace(tenantId: string, excludeAppId: LynkkoAppId): Promise<MarketplaceItem[]>

  // ── Reports ─────────────────────────────────────────────────────────────────
  getMRR(): Promise<number>
  getTopTenants(limit?: number): Promise<TopTenantStat[]>
}
```

---

### 5.19 `@lynkko/offline-sync`

```typescript
// ─── Core (Node + browser) ────────────────────────────────────────────────────

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

interface PendingMutation {
  id: string
  operation: 'create' | 'update' | 'delete'
  resource: string
  resourceId: string
  payload: unknown
  createdAt: number  // timestamp ms
  retries: number
}

class MutationQueue {
  constructor(options?: { maxRetries?: number; storageKey?: string })
  push(mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retries'>): PendingMutation
  remove(id: string): void
  incrementRetry(id: string): void
  getAll(): PendingMutation[]      // excluye los que superaron maxRetries
  getFailed(): PendingMutation[]   // solo los que superaron maxRetries
  count(): number
  clear(): void
}

registerServiceWorker(options?: {
  swPath?: string        // default: '/sw.js'
  scope?: string         // default: '/'
  onUpdate?: (reg: ServiceWorkerRegistration) => void
}): Promise<ServiceWorkerRegistration | null>

SW_TEMPLATE: string  // template listo para copiar a public/sw.js

// ─── React (cliente) — importar desde '@lynkko/offline-sync/client' ──────────

createOfflineStore(dbName: string, schema: OfflineStoreSchema, version?: number): Dexie
getTable<T>(db: Dexie, tableName: string): Table<T, string>

function OfflineSyncProvider(props: {
  queue: MutationQueue
  store: Dexie
  syncFn: (mutation: PendingMutation) => Promise<void>
  children: ReactNode
}): JSX.Element

function useOfflineSync(): {
  isOnline: boolean
  status: SyncStatus
  pendingCount: number
  lastSynced: Date | null
  error: string | null
  sync(): Promise<void>       // replay manual de la cola
  enqueue(mutation: Omit<PendingMutation, 'id'|'createdAt'|'retries'>): void
}

function useSyncStatus(): {
  isOnline: boolean
  pendingCount: number
  lastSynced: Date | null
}
```

---

### 5.20 `@lynkko/ui`

```typescript
// ─── Theming ──────────────────────────────────────────────────────────────────

interface AppTheme {
  primary: string            // hex, requerido
  secondary?: string
  accent?: string
  appName?: string
  logoUrl?: string
  faviconUrl?: string
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

DEFAULT_THEME: AppTheme     // primary '#166534' (Lynkko green)

function ThemeProvider(props: { theme?: AppTheme | null; children: ReactNode }): JSX.Element
function useTheme(): AppTheme

// ─── Tailwind preset (importar como '@lynkko/ui/tailwind') ───────────────────

lynkkoPreset: Config  // extiende tailwind con todos los tokens CSS

// ─── Primitivos (Radix UI + cva) ─────────────────────────────────────────────

// Button
type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'
function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: ButtonSize; asChild?: boolean
}): JSX.Element

// Input
function Input(props: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }): JSX.Element

// Badge
type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'muted'
function Badge(props: HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }): JSX.Element

// Card
function Card(props: HTMLAttributes<HTMLDivElement>): JSX.Element
function CardHeader(props: HTMLAttributes<HTMLDivElement>): JSX.Element
function CardTitle(props: HTMLAttributes<HTMLHeadingElement>): JSX.Element
function CardDescription(props: HTMLAttributes<HTMLParagraphElement>): JSX.Element
function CardContent(props: HTMLAttributes<HTMLDivElement>): JSX.Element
function CardFooter(props: HTMLAttributes<HTMLDivElement>): JSX.Element

// Avatar (Radix)
function Avatar(props): JSX.Element
function AvatarImage(props: { src: string; alt: string }): JSX.Element
function AvatarFallback(props): JSX.Element

// Skeleton
function Skeleton(props: HTMLAttributes<HTMLDivElement>): JSX.Element

// Modal (Radix Dialog)
function Modal(props: {
  open: boolean; onOpenChange: (v: boolean) => void;
  title: string; description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: ReactNode;
}): JSX.Element

// Tabs (Radix)
function Tabs(props): JSX.Element
function TabsList(props): JSX.Element
function TabsTrigger(props: { value: string } & ...): JSX.Element
function TabsContent(props: { value: string } & ...): JSX.Element

// ─── Componentes de dominio ───────────────────────────────────────────────────

function MetricCard(props: {
  label: string; value: string | number;
  change?: number;     // positivo = verde, negativo = rojo
  icon?: ReactNode;
  footer?: string;
  className?: string;
}): JSX.Element

function NotificationBell(props: {
  count?: number;      // 0 = sin badge
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}): JSX.Element

type PlanTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise' | 'custom'
function PlanBadge(props: {
  plan:      PlanTier | string  // acepta cualquier string (fallback a estilo custom)
  showIcon?: boolean            // default: true — ícono estrella en planes pagos
  className?: string
}): JSX.Element

function UserAvatar(props: {
  name: string;
  imageUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}): JSX.Element

interface TenantOption { id: string; name: string; logoUrl?: string | null; plan?: string }
function TenantSelector(props: {
  current:   TenantOption
  options:   TenantOption[]
  onSelect:  (tenant: TenantOption) => void
  className?: string
}): JSX.Element

// ─── Utilidades ───────────────────────────────────────────────────────────────
export { cn } from '@lynkko/utils'
```

---

## 6. Patrones transversales

### 6.1 Multi-tenancy

Todas las apps usan **multi-tenancy explícita por código** — no RLS de PostgreSQL.

```typescript
// REGLA: Todo query que lea o escriba datos de negocio DEBE incluir eq(table.tenantId, ctx.tenantId)

// ✅ Correcto
const leads = await db.select().from(leadsTable)
  .where(and(
    eq(leadsTable.tenantId, ctx.tenantId),
    eq(leadsTable.status, 'active'),
  ))

// ❌ Incorrecto — leak cross-tenant
const allLeads = await db.select().from(leadsTable)
```

El `tenantId` se obtiene de la sesión auth:
```typescript
// src/lib/context.ts (por app)
const session = await auth.api.getSession({ headers: req.headers })
const tenantId = session?.user.tenantId
```

### 6.2 Theming por tenant/app

El tema viaja desde la DB hasta los CSS custom properties del documento:

```
tenant_app_access.theme (jsonb)
  → platform.getAppTheme(tenantId, appId)
  → <ThemeProvider theme={theme}>
  → applyTheme() en useEffect
  → document.documentElement.style.setProperty('--primary', hsl)
  → Tailwind: bg-primary = hsl(var(--primary) / <alpha-value>)
  → Componente renderizado con color del tenant
```

Integración en `app/layout.tsx`:
```typescript
import { ThemeProvider } from '@lynkko/ui'
import { createPlatformClient } from '@lynkko/platform'

export default async function RootLayout({ children }) {
  const platform = createPlatformClient(db)
  const theme = await platform.getAppTheme(tenantId, 'turnflow')

  return (
    <html>
      <body>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 6.3 Offline-first

Módulos que requieren offline (Turnflow, PEC en campo):

```typescript
// 1. Registrar SW al iniciar la app
useEffect(() => {
  registerServiceWorker({ swPath: '/sw.js', onUpdate: () => console.log('Update available') })
}, [])

// 2. Configurar el store local
const store = createOfflineStore('app-db', {
  appointments: '++id, tenantId, startAt',
  leads: '++id, tenantId, status',
})

// 3. Envolver la app
<OfflineSyncProvider queue={queue} store={store} syncFn={syncMutation}>
  <App />
</OfflineSyncProvider>

// 4. En componentes
const { isOnline, enqueue, pendingCount } = useOfflineSync()

async function handleCreateLead(data) {
  if (isOnline) {
    await fetch('/api/leads', { method: 'POST', body: JSON.stringify(data) })
  } else {
    enqueue({ operation: 'create', resource: 'lead', resourceId: crypto.randomUUID(), payload: data })
    // También guardar en Dexie para UI optimista
    await store.table('leads').add({ ...data, _pending: true })
  }
}
```

### 6.4 Audit trail

Registrar en log de auditoría después de cada operación de escritura:

```typescript
const audit = createAuditLogger(db)

// En un Route Handler
export async function POST(req: Request) {
  const ctx = await getContext(req)
  const lead = await createLead(ctx.db, ctx.tenantId, body)

  await audit.log({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: AUDIT_ACTIONS.LEAD_CREATED,
    resource: 'lead',
    resourceId: lead.id,
    meta: { name: lead.name, source: body.source },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  return created(lead)
}
```

---

## 7. Schemas de base de datos

Cada paquete que necesita persistencia define su schema en `src/index.ts` (o `src/schema.ts`).
Las apps deben migrar estos schemas con `drizzle-kit`.

### 7.1 `@lynkko/auth`

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  image       TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id),
  expires_at  TIMESTAMP NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id                    TEXT PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES users(id),
  account_id            TEXT NOT NULL,
  provider_id           TEXT NOT NULL,
  access_token          TEXT,
  refresh_token         TEXT,
  access_token_expires_at TIMESTAMP,
  refresh_token_expires_at TIMESTAMP,
  scope                 TEXT,
  id_token              TEXT,
  password              TEXT,
  created_at            TIMESTAMP NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE verifications (
  id          TEXT PRIMARY KEY,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP,
  updated_at  TIMESTAMP
);
```

### 7.2 `@lynkko/notifications`

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  user_id     UUID NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  type        TEXT,
  link        TEXT,
  meta        JSONB,
  read_at     TIMESTAMP,      -- NULL = no leída
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX notifications_tenant_user_idx ON notifications(tenant_id, user_id);
CREATE INDEX notifications_created_at_idx ON notifications(created_at);
```

### 7.3 `@lynkko/audit`

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  user_id     UUID,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id TEXT,
  meta        JSONB,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX audit_tenant_idx   ON audit_logs(tenant_id);
CREATE INDEX audit_user_idx     ON audit_logs(user_id);
CREATE INDEX audit_action_idx   ON audit_logs(action);
CREATE INDEX audit_resource_idx ON audit_logs(resource, resource_id);
CREATE INDEX audit_created_idx  ON audit_logs(created_at);
```

### 7.4 `@lynkko/platform`

```sql
-- Registro de apps del ecosistema
CREATE TABLE platform_apps (
  id          TEXT PRIMARY KEY,   -- 'pec' | 'turnflow' | ...
  name        TEXT NOT NULL,
  description TEXT,
  url         TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- Módulos por app
CREATE TABLE platform_modules (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(app_id, slug)
);

-- Acceso de tenant a una app
CREATE TABLE tenant_app_access (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  app_id      TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  is_enabled  BOOLEAN NOT NULL DEFAULT false,
  theme       JSONB,               -- AppTheme | null
  config      JSONB,               -- config específica de la app
  enabled_at  TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, app_id)
);
CREATE INDEX tenant_app_tenant_idx ON tenant_app_access(tenant_id);

-- Acceso de tenant a un módulo
CREATE TABLE tenant_module_access (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  app_id      TEXT NOT NULL,
  module_id   TEXT NOT NULL REFERENCES platform_modules(id) ON DELETE CASCADE,
  is_enabled  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_id)
);

-- Tenants (organizaciones/marcas)
CREATE TABLE tenants (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  country       TEXT,
  timezone      TEXT DEFAULT 'America/Bogota',
  contact_email TEXT,
  contact_phone TEXT,
  logo_url      TEXT,
  status        TEXT NOT NULL DEFAULT 'trial',   -- TenantStatus
  trial_ends_at TIMESTAMP,
  notes         TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP NOT NULL DEFAULT now()
);

-- Catálogo de planes por app (gestionado desde superadmin)
CREATE TABLE app_plans (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  monthly_price INTEGER NOT NULL DEFAULT 0,
  annual_price  INTEGER NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'COP',
  max_seats     INTEGER,
  features      JSONB,               -- string[] de feature slugs habilitadas
  is_public     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(app_id, slug)
);

-- Suscripciones de tenant a un plan de una app
CREATE TABLE subscriptions (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            TEXT NOT NULL,
  app_id               TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  plan_id              TEXT NOT NULL REFERENCES app_plans(id),
  status               TEXT NOT NULL DEFAULT 'trialing',   -- SubscriptionStatus
  seats                INTEGER NOT NULL DEFAULT 1,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end   TIMESTAMP NOT NULL,
  trial_start          TIMESTAMP,
  trial_end            TIMESTAMP,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at          TIMESTAMP,
  metadata             JSONB,
  created_at           TIMESTAMP NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, app_id)
);
CREATE INDEX sub_status_idx ON subscriptions(status);

-- Facturas internas del ecosistema
CREATE TABLE invoices (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  number                TEXT NOT NULL UNIQUE,           -- 'INV-20240621-AB12'
  tenant_id             TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft',  -- InvoiceStatus
  currency              TEXT NOT NULL DEFAULT 'COP',
  subtotal              INTEGER NOT NULL DEFAULT 0,
  tax                   INTEGER NOT NULL DEFAULT 0,
  total                 INTEGER NOT NULL DEFAULT 0,
  due_date              TIMESTAMP,
  paid_at               TIMESTAMP,
  period_start          TIMESTAMP,
  period_end            TIMESTAMP,
  wompi_transaction_id  TEXT,
  wompi_payment_method  JSONB,
  notes                 TEXT,
  created_at            TIMESTAMP NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX invoice_tenant_idx  ON invoices(tenant_id);
CREATE INDEX invoice_status_idx  ON invoices(status);

-- Ítems de factura
CREATE TABLE invoice_items (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  app_id          TEXT REFERENCES platform_apps(id),
  subscription_id TEXT REFERENCES subscriptions(id),
  description     TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      INTEGER NOT NULL DEFAULT 0,
  amount          INTEGER NOT NULL DEFAULT 0
);

-- Registros de uso (métrica diaria por tenant/app)
-- metric: 'active_users' | 'sessions' | 'api_calls' | 'storage_mb'
-- period: 'YYYY-MM-DD'
CREATE TABLE usage_records (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  app_id      TEXT NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
  metric      TEXT NOT NULL,
  value       INTEGER NOT NULL DEFAULT 0,
  period      TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, app_id, metric, period)
);
CREATE INDEX usage_period_idx ON usage_records(period);
```

---

## 8. Integración en una app Next.js

Setup completo para una nueva app del ecosistema.

### 8.1 Instalación

Agregar `.npmrc` en la raíz de cada app consumidora (solo la URL, sin token):

```ini
# .npmrc  (commitear)
@lynkko:registry=https://npm.pkg.github.com
```

Configurar el token en Vercel → Settings → Environment Variables:
```
GITHUB_TOKEN = ghp_...  (PAT con read:packages)
```

Configurar el Install Command en Vercel → Settings → Build & Development Settings:
```bash
echo "//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" >> ~/.npmrc && pnpm install --frozen-lockfile
```

```bash
pnpm add @lynkko/utils @lynkko/db @lynkko/auth @lynkko/email
pnpm add @lynkko/push @lynkko/ui @lynkko/platform @lynkko/audit
pnpm add @lynkko/notifications @lynkko/offline-sync
```

### 8.2 `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'
import { lynkkoPreset } from '@lynkko/ui/tailwind'

export default {
  presets: [lynkkoPreset],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
} satisfies Config
```

### 8.3 `app/layout.tsx`

```typescript
import '@lynkko/ui/styles.css'
import { ThemeProvider } from '@lynkko/ui'
import { createPlatformClient } from '@lynkko/platform'
import { db } from '@/lib/db'
import { getTenantId } from '@/lib/auth'

export default async function RootLayout({ children }) {
  const tenantId = await getTenantId()
  const platform = createPlatformClient(db)
  const theme = tenantId
    ? await platform.getAppTheme(tenantId, 'turnflow')
    : null

  return (
    <html lang="es">
      <body>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 8.4 `src/lib/db/index.ts`

```typescript
import { createDb } from '@lynkko/db'
import * as schema from './schema'

export const db = createDb(schema)
export type Db = typeof db
```

### 8.5 `src/lib/auth.ts`

```typescript
import { createLynkkoAuth } from '@lynkko/auth'
import { sendEmail, lynkkoEmailTemplate } from '@lynkko/email'
import { db } from './db'

export const auth = createLynkkoAuth({
  db,
  appName: 'Turnflow',
  appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  secret: process.env.AUTH_SECRET!,
  sendResetPassword: async ({ url, user }) =>
    sendEmail({
      to: user.email,
      subject: 'Recupera tu contraseña — Turnflow',
      html: lynkkoEmailTemplate({
        title: 'Recuperar contraseña',
        content: `<p>Hola ${user.name}, haz click para resetear tu contraseña.</p>`,
        ctaText: 'Recuperar contraseña',
        ctaUrl: url,
      }),
    }),
})

export async function getTenantId(): Promise<string | null> {
  const { headers } = await import('next/headers')
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.tenantId ?? null
}
```

### 8.6 Migraciones

```bash
# drizzle.config.ts — apunta a DATABASE_URL_UNPOOLED
pnpm dlx drizzle-kit generate
pnpm dlx drizzle-kit migrate
```

### 8.7 `.env.local` mínimo

```bash
DATABASE_URL=postgresql://...@ep-xxx.neon.tech/dbname?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://...@ep-xxx-direct.neon.tech/dbname?sslmode=require
AUTH_SECRET=<random-32-chars>
NEXT_PUBLIC_APP_URL=https://turnflow.co
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL="Turnflow <no-reply@turnflow.co>"
```

---

## 9. Variables de entorno — referencia completa

| Variable | Paquete | Scope | Descripción |
|----------|---------|-------|-------------|
| `DATABASE_URL` | `@lynkko/db` | Servidor | Conexión pooled Neon |
| `DATABASE_URL_UNPOOLED` | `@lynkko/db` | Servidor | Conexión directa (migraciones) |
| `AUTH_SECRET` | `@lynkko/auth` | Servidor | Secret de Better Auth (≥ 32 chars) |
| `RESEND_API_KEY` | `@lynkko/email` | Servidor | API key de Resend |
| `RESEND_FROM_EMAIL` | `@lynkko/email` | Servidor | Remitente por defecto |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `@lynkko/push` | Público | Clave VAPID pública |
| `VAPID_PRIVATE_KEY` | `@lynkko/push` | Servidor | Clave VAPID privada |
| `VAPID_SUBJECT` | `@lynkko/push` | Servidor | `mailto:...` — opcional |
| `WOMPI_PUBLIC_KEY` | `@lynkko/wompi` | Servidor | `pub_prod_...` |
| `WOMPI_PRIVATE_KEY` | `@lynkko/wompi` | Servidor | `prv_prod_...` |
| `WOMPI_WEBHOOK_SECRET` | `@lynkko/wompi` | Servidor | Secret de eventos Wompi |
| `WOMPI_SANDBOX` | `@lynkko/wompi` | Servidor | `'true'` en dev/staging |
| `OPENAI_API_KEY` | `@lynkko/ai` | Servidor | API key de OpenAI |
| `APPLE_TEAM_ID` | `@lynkko/wallets` | Servidor | Team ID de Apple Developer |
| `APPLE_PASS_TYPE_ID` | `@lynkko/wallets` | Servidor | Pass Type Identifier |
| `GOOGLE_ISSUER_ID` | `@lynkko/wallets` | Servidor | Issuer ID de Google Wallet |

---

## 11. Aplicaciones del ecosistema

Mapa técnico de cada aplicación: working definition (OS v0.4), ICPs prioritarios, paquetes `@lynkko/*` requeridos y estado del repo.

---

### 10.1 Lynkko Superadmin Platform

**Repo:** `Lynkko/lynkko-platform-admin` *(en construcción)*  
**Color de identidad:** Violet 900 `#4c1d95` — indica acceso superadmin  
**Paquetes:** `utils`, `db`, `auth`, `audit`, `platform`, `ui`

Aplicación de administración exclusiva del equipo Lynkko. Controla:
- Tenants activos y sus apps habilitadas (`tenant_app_access`)
- Tema por tenant/app (`theme jsonb`)
- Módulos y feature flags por app
- Planes de billing y límites por tenant

Usa `@lynkko/platform` (`PlatformClient`) como único punto de escritura sobre la base de datos maestra.

---

### 10.2 Lynkko App — Plataforma de Éxito Comercial

**Repo:** `Lynkko/lynkko-app`  
**Color de identidad:** Slate 800 `#1e293b`  
**Paquetes principales:** `utils`, `db`, `auth`, `email`, `push`, `audit`, `notifications`, `ui`, `platform`  
**Paquetes opcionales:** `ai`, `webhooks`, `api-keys`

**Working definition (OS v0.4):**  
Herramienta de ejecución comercial, visibilidad del proceso de ventas y actividad del equipo en tiempo real. **No es un CRM tradicional** — es una Plataforma de Éxito Comercial que documenta y mejora el proceso completo desde el primer contacto hasta el cierre.

**Dolores que resuelve:**
- Equipos comerciales con procesos fragmentados
- Managers sin visibilidad en tiempo real de actividades
- Seguimiento dependiente de memoria o reportes manuales
- Falta de claridad sobre lo que ocurre antes del cierre

**ICPs prioritarios (OS v0.4):**
- Empresas medianas/grandes con ventas consultivas y alto volumen de prospectos
- Múltiples asesores, líderes comerciales y metas de equipo
- Sectores: construcción, hoteles, educación, salud premium, inmobiliaria, automotriz, seguros, turismo

**Implicaciones técnicas:**
- Multi-tenant estricto: cada tenant tiene su pipeline de ventas independiente
- Módulo de AI copilot (`@lynkko/ai`) para análisis de oportunidades y asistencia al asesor
- Audit log completo (`@lynkko/audit`) de toda actividad comercial
- Notificaciones push (`@lynkko/push`) para alertas de seguimiento

---

### 10.3 Lynkko Incentivos

**Repo:** `Lynkko/lynkko-incentivos`  
**Color de identidad:** Emerald 700 `#047857`  
**Paquetes principales:** `utils`, `db`, `auth`, `notifications`, `ui`, `platform`  
**Paquetes opcionales:** `billing`, `currency`, `ai`, `push`

**Working definition (OS v0.4):**  
Motivación, reconocimiento, gamificación, puntos, metas y programas de incentivos. **Reconoce equipos internos** (asesores, operaciones, aliados, backoffice) — **no** es un programa de fidelización de clientes externos (ese rol lo cumple ClubPass).

**Dolores que resuelve:**
- Incentivos calculados tarde, reconocimiento desconectado del comportamiento diario
- Equipos que no saben su posición en tiempo real
- Managers que no pueden motivar comportamientos específicos consistentemente

**ICPs prioritarios (OS v0.4):**
- Empresas con equipos comerciales, operativos o de servicio con metas medibles
- Sectores: construcción, retail, hoteles, call centers, seguros, educación, salud, CPG, B2B sales

**Implicaciones técnicas:**
- Motor de reglas para cálculo de puntos en tiempo real (no a fin de mes)
- `@lynkko/currency` para normalizar incentivos en múltiples monedas LATAM
- Integración bi-direccional con Lynkko App (mismos pipelines, distintos dashboards)

---

### 10.4 Turnflow by Lynkko — Sistema de verticales

**Repo base:** `Lynkko/lynkko-turnflow` *(migración en curso desde `gvelasquez85/turnos-app`)*  
**Color de identidad:** Sky 700 `#0369a1` + acento único por vertical  
**Paquetes principales:** `utils`, `db`, `auth`, `email`, `notifications`, `ui`, `platform`  
**Paquetes adicionales:** `offline-sync`, `qr`, `push`, `webhooks`

**Working definition (OS v0.4):**  
SaaS simple y verticalizado para negocios locales: reservas, pedidos, clientes, citas, solicitudes y seguimiento de prospectos. El problema central es que el seguimiento ocurre en WhatsApp, Excel, agendas manuales o memoria — sin sistema.

**Filosofía del producto:**  
TurnFlow es más simple que las apps enterprise de Lynkko. Está diseñado para pequeños negocios en proceso de transformación digital que no tienen flujos complejos pero sí una necesidad real de organización. No requiere configuración avanzada, onboarding largo ni roles empresariales.

**9 verticales — una sola base de código:**

| Vertical | Acento | Hex | Audiencia |
|----------|--------|-----|-----------|
| TurnFlow Belleza | Pink 700 | `#be185d` | Spas, salones, nail art, barberías |
| TurnFlow Tienda | Green 700 | `#15803d` | Tiendas, retail, boutiques |
| TurnFlow Restaurante | Orange 700 | `#c2410c` | Restaurantes, cafés, catering |
| TurnFlow Salud | Cyan 700 | `#0e7490` | Consultorios, dental, veterinaria |
| TurnFlow Copropiedad | Slate 600 | `#475569` | Conjuntos, parqueaderos |
| TurnFlow Consultoría | Blue 900 | `#1e3a8a` | Asesorías, legal, financiero |
| TurnFlow Encargos | Amber 800 | `#92400e` | Mensajería, delivery, servicios |
| TurnFlow Dropshipping | Gray 700 | `#374151` | Ecommerce, tienda digital |
| TurnFlow Hospitalidad | Yellow 700 | `#a16207` | Hoteles, hostales, turismo |

**Implicaciones técnicas:**
- **Un único repo** — las 9 verticales son el mismo codebase; la vertical activa se controla via feature flag en `tenant_app_access.vertical_type`
- `@lynkko/offline-sync` es crítico: negocios locales necesitan trabajar sin conexión estable
- `@lynkko/qr` para check-in de clientes, acceso a historial y confirmaciones de cita
- Planes escalonados: Basic / Pro / Plus — implementados via `@lynkko/billing`
- **Paquetes NO requeridos** en TurnFlow: `ai`, `dian`, `wallets`, `currency`, `audit`, `api-keys` — manteniendo la base liviana para SMB

**Integración con apps Lynkko enterprise (via webhooks):**

Los negocios que crecen pueden conectar TurnFlow a las apps más grandes del ecosistema mediante `@lynkko/webhooks`. Esta conexión es **opcional** y no requerida para el funcionamiento básico:

```typescript
import { registerWebhook } from '@lynkko/webhooks'

// Ejemplo: enviar nuevos clientes de TurnFlow → Lynkko App (PEC)
await registerWebhook({
  sourceApp:  'turnflow',
  targetApp:  'pec',
  event:      'customer.created',
  targetUrl:  process.env.LYNKKO_APP_WEBHOOK_URL,
  secret:     process.env.WEBHOOK_SECRET,
})

// Evento enviado automáticamente cuando se crea un cliente
// { event: 'customer.created', tenantId, data: { name, phone, vertical, ... } }
```

**Casos de integración frecuentes:**
- `customer.created` → sincroniza lead en Lynkko App para seguimiento enterprise
- `appointment.completed` → activa puntos en Lynkko Incentivos
- `order.paid` → dispara factura en Lynkko Facturación
- `customer.returning` → notifica a ClubPass para activar beneficio de membresía

**ICPs prioritarios (OS v0.4):**
- Negocios locales de 1-30 empleados con clientes recurrentes
- Dueños que manejan el seguimiento por WhatsApp, Excel o memoria
- Negocios que quieren transformación digital sin complejidad enterprise

---

### 10.5 ClubPass by Lynkko

**Repo:** `gvelasquez85/clubpass` *(migración a `Lynkko/lynkko-clubpass` pendiente)*  
**Color de identidad:** Blue 700 `#1d4ed8`  
**Paquetes principales:** `utils`, `db`, `auth`, `notifications`, `ui`, `platform`  
**Paquetes adicionales:** `wallets` (Apple/Google pass), `qr`, `wompi`, `billing`

**Working definition (OS v0.4):**  
Membresías y fidelización para **clientes externos**: registro de acciones, reconocimiento de recurrencia, entrega de beneficios, redemptions y creación de clubes de clientes. **Complementa a Lynkko App** — ClubPass es el lado del cliente, App es el lado del asesor/manager.

**Dolores que resuelve:**
- Negocios que quieren retener clientes pero no tienen sistema para gestionar membresías
- Membresías manejadas manualmente o en herramientas desconectadas
- Clientes perciben descuentos pero no pertenencia ni valor de membresía

**ICPs prioritarios (OS v0.4):**
- Restaurantes, gimnasios, hoteles, belleza, retail, clubs, comunidades
- Educación, salud preventiva, entretenimiento

**Implicaciones técnicas:**
- `@lynkko/wallets` para tarjetas digitales Apple Wallet y Google Wallet
- `@lynkko/wompi` para procesamiento de cuotas de membresía en Colombia
- `@lynkko/billing` para gestión de renovaciones automáticas y planes por miembro activo
- `@lynkko/qr` para redemptions en punto de venta

---

### 10.6 Lynkko Customer

**Repo:** *(pendiente — `Lynkko/lynkko-customer`)*  
**Color de identidad:** Gray 600 `#4b5563`  
**Paquetes principales:** `utils`, `db`, `auth`, `email`, `notifications`, `ui`, `platform`  
**Paquetes opcionales:** `push`, `webhooks`

**Working definition (OS v0.4):**  
Gestión de solicitudes internas y externas: las empresas registran, controlan, resuelven y exponen el estado de solicitudes de clientes con trazabilidad completa. El cliente puede consultar el estado sin necesidad de contactar al equipo.

**Dolores que resuelve:**
- Empresas que reciben solicitudes/PQRS sin trazabilidad ni visibilidad externa
- Clientes que constantemente preguntan el estado de su caso
- Equipos de soporte que repiten la misma información
- Pérdida de confianza porque el cliente no sabe qué está pasando

**ICPs prioritarios (OS v0.4):**
- Construcción, hoteles, salud, educación, servicios técnicos, inmobiliaria
- Copropiedades, ecommerce, empresas reguladas

**Implicaciones técnicas:**
- Portal externo incluido para que el cliente consulte estado sin autenticarse
- Integración natural con Lynkko Help (casos sin resolver escalan a Customer)
- Implementación sugerida: license model por usuario interno + portal externo incluido

---

### 10.7 Lynkko Help

**Repo:** *(pendiente — `Lynkko/lynkko-help`)*  
**Color de identidad:** Teal 600 `#0d9488`  
**Paquetes principales:** `utils`, `db`, `auth`, `ui`, `platform`  
**Paquetes opcionales:** `ai` (diagnóstico guiado), `webhooks`

**Working definition (OS v0.4):**  
Software para construir centros de ayuda, FAQs, documentación y bases de conocimiento self-service. Evolución prevista: de FAQ estático a **diagnóstico guiado interactivo** donde el cliente selecciona su problema, responde preguntas y recibe solución multimedia; si no se resuelve, el caso escala automáticamente a Lynkko Customer con información precargada.

**Dolores que resuelve:**
- Negocios que responden las mismas preguntas repetidamente
- Clientes que no encuentran información básica
- Equipos de soporte sobrecargados por solicitudes repetitivas

**ICPs prioritarios (OS v0.4):**
- Hoteles, educación, salud, software, ecommerce, copropiedades, servicios técnicos

**Implicaciones técnicas:**
- `@lynkko/ai` para el módulo de diagnóstico guiado (árbol de decisiones + respuestas)
- Integración con Customer: `webhooks` para escalar casos no resueltos
- Modelo de pricing: flat fee por help center con planes por volumen de contenido

---

### 10.8 Lynkko Facturación

**Repo:** *(pendiente — `Lynkko/lynkko-facturacion`)*  
**Color de identidad:** Amber 700 `#b45309`  
**Paquetes principales:** `utils`, `db`, `auth`, `email`, `ui`, `platform`  
**Paquetes especializados:** `dian`, `api-keys`, `webhooks`

**Working definition (OS v0.4):**  
Facturación electrónica para empresas colombianas que necesitan generar facturas desde CSV, API, sistemas existentes o **eventos del ecosistema Lynkko** (ventas de App, reservas de Turnflow, membresías de ClubPass) para cumplir obligaciones legales DIAN.

**Dolores que resuelve:**
- Pequeños negocios que necesitan cumplir requisitos de facturación electrónica
- Opciones existentes complejas, costosas o desconectadas del proceso comercial
- Plataformas o empresas que necesitan facturación electrónica via API
- Flujo desconectado: clientes y ventas en un sistema, facturas en otro

**ICPs prioritarios (OS v0.4):**
- Retail, restaurantes, servicios, ecommerce, SaaS platforms
- Empresas con ventas recurrentes, clientes Lynkko que quieren facturar eventos del ecosistema

**Riesgos técnicos documentados (OS v0.4):**
- Certificado DIAN pendiente de habilitación (bloqueante para producción)
- Categoría altamente competitiva: diferenciador es la integración con el ecosistema
- Regulación aplica solo a Colombia

**Implicaciones técnicas:**
- `@lynkko/dian` provee todas las utilidades de validación y serialización DIAN
- `@lynkko/api-keys` para integración con sistemas externos de terceros
- `@lynkko/webhooks` para recibir eventos de otras apps del ecosistema
- Modelo de pricing: por factura enviada, paquetes mensuales o prepago

---

## 12. Bundles del ecosistema

El OS v0.4 define 7 paquetes comerciales recomendados. Cada bundle tiene implicaciones técnicas en la habilitación de `tenant_app_access` y en la configuración de planes de `@lynkko/billing`.

| Bundle | Productos incluidos | Segmento | Rationale |
|--------|--------------------|---------:|-----------|
| **Éxito Comercial Enterprise** | App + Incentivos | Enterprise | Gestión comercial + reconocimiento interno del equipo |
| **Operación Comercial Completa** | App + Incentivos + Facturación | Enterprise | Proceso, motivación y facturación de eventos comerciales |
| **Experiencia Cliente Enterprise** | Customer + Help + ClubPass | Enterprise | Servicio, autoservicio y fidelización |
| **Constructoras / Proyectos Alto Valor** | App + Incentivos + Customer | Enterprise | Salas de ventas, asesores, metas y posventa |
| **Hoteles / Hospitalidad** | App + ClubPass + Customer + Help | Enterprise | Adquisición, experiencia, fidelización y atención |
| **Pequeño Negocio Recurrente** | Turnflow + ClubPass | SMB | Operación diaria + clientes que vuelven |
| **Pequeño Negocio Formalizado** | Turnflow + Facturación | SMB | Operación simple + cumplimiento legal |

### Habilitación técnica de bundles

```typescript
// Ejemplo: habilitar bundle "Pequeño Negocio Recurrente"
await platform.setAppAccess(tenantId, [
  { appType: 'turnflow',  enabled: true,  plan: 'pro' },
  { appType: 'clubpass',  enabled: true,  plan: 'base' },
])

// Ejemplo: bundle "Hoteles / Hospitalidad"
await platform.setAppAccess(tenantId, [
  { appType: 'pec',        enabled: true,  plan: 'enterprise' },
  { appType: 'clubpass',   enabled: true,  plan: 'enterprise' },
  { appType: 'customer',   enabled: true,  plan: 'enterprise' },
  { appType: 'help',       enabled: true,  plan: 'pro' },
])
```

Los planes válidos por app se definen en el `PlanRegistry` de `@lynkko/billing`. El superadmin los activa desde `lynkko-platform-admin` via `PlatformClient`.

---

## 13. Agente Comercial IA — especificación técnica

**Fuente:** Lynkko Ecosystem OS v0.4, §11  
**Estado:** Especificado — implementación pendiente  
**Repo sugerido:** módulo dentro de `lynkko-app` o servicio independiente `Lynkko/lynkko-agent`

### 13.1 Propósito

Asistente semi-autónomo que reduce el trabajo manual del equipo comercial (actualmente 2 personas) en prospección, perfilado, segmentación, redacción de mensajes, seguimiento y preparación de handoffs para demos/diagnósticos.

### 13.2 Tareas principales

| Tarea | Input | Output | Paquete |
|-------|-------|--------|---------|
| Perfilar prospectos | Datos disponibles del lead | Resumen estructurado | `@lynkko/ai` |
| Clasificar ICP, vertical y pain | Perfil del lead | Etiquetas + fit score | `@lynkko/ai` |
| Calcular fit score e intent score | Campos PEC + señales | Score 0-100 | `@lynkko/ai` |
| Redactar primer contacto personalizado | Perfil + producto | Mensaje draft | `@lynkko/ai` |
| Redactar follow-ups | Historial de conversación | Mensaje draft | `@lynkko/ai` |
| Resumir respuestas | Respuesta del prospecto | Resumen + next action | `@lynkko/ai` |
| Preparar brief de demo/diagnóstico | Conversación completa | Brief estructurado | `@lynkko/ai` |
| Sugerir actualizaciones PEC | Conversación + stage actual | Campos a actualizar | `@lynkko/ai` |

### 13.3 Guardrails (reglas de operación)

```typescript
const AGENT_GUARDRAILS = {
  // Acciones bloqueadas sin aprobación humana
  blocked: [
    'send_bulk_messages',           // no envío masivo sin revisión
    'scrape_social_media',          // no scraping de LinkedIn/IG/TikTok
    'promise_unconfirmed_features', // no prometer capabilities no confirmadas
    'contact_enterprise_cold',      // enterprise siempre requiere revisión humana
  ],
  // Escalado automático a humano cuando:
  escalate_when: [
    'pricing_question',
    'demo_interest',
    'enterprise_opportunity',
    'legal_or_contractual',
    'prospect_frustration',
    'unclear_product_capability',
  ],
  // Modo de operación
  mode: 'semi_autonomous', // drafts generados, humano aprueba antes del primer contacto
}
```

### 13.4 Integración técnica

```typescript
import { createCopilot } from '@lynkko/ai'

const agent = createCopilot({
  model:       'gpt-4o',
  tenantId:    LYNKKO_INTERNAL_TENANT_ID,
  rateLimits:  { rpm: 60, tpm: 100_000 },
  tools: [
    'profile_lead',
    'classify_icp',
    'score_lead',
    'draft_message',
    'summarize_reply',
    'prepare_demo_brief',
    'suggest_pec_update',
  ],
})

// El agente no envía mensajes directamente — genera drafts para revisión humana
const draft = await agent.draftFirstContact({ leadId, productEntry: 'turnflow' })
// → { subject, body, suggestedChannel, painSignal, fitScore }
```

### 13.5 Modelo de datos del agente

El agente lee y escribe en las tablas de Lynkko App (PEC) usando los campos del modelo de datos definido en §14. Nunca escribe directamente — propone actualizaciones que un humano confirma antes de persistir.

---

## 14. Modelo de datos PEC — campos y pipeline

**Fuente:** Lynkko Ecosystem OS v0.4, §6  
**Tabla:** `leads` en `@lynkko/db` (multi-tenant, dentro del schema del tenant PEC)  
**Propósito:** Lynkko PEC es el command center interno del equipo Lynkko para prospección, calificación, seguimiento y aprendizaje comercial.

### 14.1 Campos recomendados

```sql
-- Tabla leads (campos recomendados OS v0.4)
CREATE TABLE leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  -- Identificación
  lead_name       text NOT NULL,
  business_name   text,
  contact_role    text,                    -- cargo del contacto
  country         text,
  city            text,
  industry        text,
  business_size   text,                   -- '1-10' | '11-50' | '51-200' | '200+'

  -- Origen y clasificación
  source          text,                   -- 'meta_ads' | 'linkedin' | 'referral' | 'organic' | ...
  product_fit     text,                   -- 'pec' | 'turnflow' | 'clubpass' | 'incentivos' | ...
  product_interest text[],               -- múltiples productos de interés
  pain_signal     text,                   -- frase literal del prospecto
  channel         text,                   -- 'whatsapp' | 'email' | 'call' | 'linkedin'
  campaign        text,                   -- nombre de la campaña de origen

  -- Scores (calculados por AI agent)
  fit_score       smallint CHECK (fit_score BETWEEN 0 AND 100),
  intent_score    smallint CHECK (intent_score BETWEEN 0 AND 100),
  icp_tag         text,                   -- 'icp1_small_business' | 'icp2_commercial_team' | ...

  -- Estado del pipeline
  current_stage   text NOT NULL DEFAULT 'sourced',
  owner           text,                   -- email del SDR responsable
  last_interaction_at timestamptz,
  next_action     text,
  next_action_at  timestamptz,

  -- Conversación y aprendizaje
  objections      text[],
  notes           text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### 14.2 Etapas del pipeline (OS v0.4)

```typescript
export const PEC_PIPELINE_STAGES = [
  'sourced',              // 1. Lead identificado / importado
  'enriched',             // 2. Datos enriquecidos (industria, tamaño, contacto)
  'qualified_by_ai',      // 3. Agente IA calculó fit + intent score
  'human_reviewed',       // 4. Humano validó la calificación del agente
  'contacted',            // 5. Primer contacto enviado
  'responded',            // 6. Prospecto respondió
  'qualified_conversation',// 7. Conversación de calificación completada
  'demo_booked',          // 8. Demo o diagnóstico agendado
  'demo_completed',       // 9. Demo o diagnóstico completado
  'proposal_pilot',       // 10. Propuesta o piloto enviado
  'won',                  // 11. Cliente adquirido
  'lost',                 // 12. Oportunidad perdida (registrar motivo)
  'nurture',              // 13. Mantener en ciclo de nurturing
] as const

export type PecStage = typeof PEC_PIPELINE_STAGES[number]
```

### 14.3 Tags de ICP

```typescript
export const ICP_TAGS = {
  icp1_small_local:     'Pequeño negocio local (2-30 emp, WhatsApp/Excel)',
  icp2_commercial_team: 'Empresa con equipo comercial (5+ en ventas/field)',
  icp3_service_pqrs:    'Empresa con solicitudes, PQRS o posventa recurrente',
  icp4_membership:      'Negocio con membresías, fidelización o comunidad',
} as const
```

### 14.4 Uso interno (Lynkko como caso de estudio)

Lynkko usa su propio PEC como command center del equipo comercial. Esto valida el producto en producción real y genera aprendizajes de primera mano que retroalimentan el roadmap. Los ciclos de validación comercial (Sprint 0 etc.) se registran y miden aquí.

---

*Actualizado: junio 2026 — lynkko-platform v0.1.x · Lynkko Ecosystem OS v0.4*
