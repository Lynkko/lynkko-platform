# Lynkko Platform Certification Implementation Plan

> ⚠️ **DOCUMENTO HISTÓRICO — NO EJECUTAR.**
>
> Este es el plan de implementación **original** (2026-06-30) de la certificación de
> `lynkko-platform`. El trabajo **ya está completo** y la arquitectura evolucionó más
> allá de este plan. Se conserva **solo como registro histórico**.
>
> - **No es un plan activo.** No lo tomes como guía ejecutable. Los checkboxes (`- [ ]`)
>   de abajo son el estado *de aquel momento*, no tareas pendientes.
> - **Referencias obsoletas:** la rama/worktree `codex/platform-certification` que
>   menciona **ya fue borrada**, y las fallas que describe (p. ej. "`pnpm type-check`
>   falla") **ya están resueltas en `main`**.
> - **Alcance desactualizado:** este plan solo cubre `audit` y `notifications`. `main`
>   ya certifica **los cuatro** servicios del ecosistema — `audit`, `notifications`,
>   **`auth`** (SSO) y **`comms`** — más WS-5 (revenue).
>
> **Estado vigente:** `Documentacion Lynkko/ROADMAP_V3.md`, `docs/CERTIFICATION.md`,
> `docs/CAMBIOS_V3.md`.

**Goal:** Certify `lynkko-platform` as the stable control-plane base for Lynkko products, with published HTTP contracts, operational audit/notifications services, ownership governance, adoption kit, and a Turnflow pilot.

**Architecture:** `lynkko-platform` remains the source of truth for tenants, app access, plans, licenses, subscriptions, invoices/revenue, API keys, service registry, and outbound webhooks. `audit` and `notifications` run as independent Next.js service apps with their own Neon databases and SDK clients. Products consume Platform through HTTP SDKs, webhooks, cron sync, and local license/module cache; products never call Platform on every hot request.

**Tech Stack:** Turborepo, pnpm 9, Next.js 15, React 19, TypeScript, Drizzle ORM, Neon Postgres, Vercel, `@lynkko/*` workspace packages.

---

## Current Baseline

Worktree:

```bash
/Users/german/.config/superpowers/worktrees/lynkko-platform/codex-platform-certification
```

Branch:

```bash
codex/platform-certification
```

Baseline setup:

```bash
pnpm install --frozen-lockfile
```

Result: passes.

Baseline verification:

```bash
pnpm type-check
```

Result: fails in `@lynkko/admin#type-check` before certification work starts. The failure is pre-existing in the branch base and must be fixed before calling the baseline green.

Known failure classes:

- `apps/admin/drizzle.config.ts` imports `drizzle-kit`, but `apps/admin/package.json` does not declare `drizzle-kit`.
- Several admin route handlers declare unused `req` parameters.
- Several admin files have unused imports or unused type declarations.
- `apps/admin/src/app/layout.tsx` has a `React.ReactNode` type mismatch caused by cross-package React type resolution.

## Scope Check

This plan covers one certifiable subsystem: `lynkko-platform` as the platform base, including its already-created `audit` and `notifications` service apps. It does not migrate PEC, Incentivos, Turnflow, or ClubPass. It creates the artifacts those products consume in future product adoption plans.

## File Structure

Create:

- `docs/superpowers/plans/2026-06-30-platform-certification.md`
  This implementation plan.
- `docs/CERTIFICATION.md`
  Operator-facing certification guide and Definition of Done.
- `docs/GOVERNANCE.md`
  Ownership map for Platform, services, and products.
- `docs/ADOPTION_KIT.md`
  Product integration template: adapter, webhook, cron, local cache, environment variables, and smoke tests.
- `scripts/certification/assert-package-exports.mjs`
  Verifies built package exports include the HTTP clients products need.
- `scripts/certification/smoke-platform-v1.mjs`
  Runs live HTTP smoke tests against `/api/v1`.
- `scripts/certification/smoke-services.mjs`
  Runs live health and write/query smoke tests against audit and notifications.
- `scripts/certification/check-env.mjs`
  Verifies required environment variables for Platform, audit, and notifications.

Modify:

- `package.json`
  Add certification scripts.
- `apps/admin/package.json`
  Declare `drizzle-kit` as an admin dev dependency and add focused certification scripts if useful.
- `apps/admin/src/app/layout.tsx`
  Use an explicit React type import compatible with the app package.
- Admin route/action files reported by `pnpm --filter @lynkko/admin type-check`
  Remove unused imports and rename unused request parameters to `_req`.
- `docs/INTEGRACION_APP.md`
  Align with the certified HTTP-first adoption path.
- `docs/CAMBIOS_V3.md` and `docs/ARCHITECTURE.md`
  Link to certification/governance docs and mark Platform + Observability as the current certification target.

Do not modify product repos in this plan.

---

### Task 1: Restore a Green Verification Baseline

**Files:**
- Modify: `apps/admin/package.json`
- Modify: `apps/admin/src/app/layout.tsx`
- Modify: admin files reported by `pnpm --filter @lynkko/admin type-check`
- Verify: `pnpm --filter @lynkko/admin type-check`

- [ ] **Step 1: Reproduce the admin type-check failure**

Run:

```bash
pnpm --filter @lynkko/admin type-check
```

Expected: FAIL with errors matching the known baseline classes: missing `drizzle-kit`, unused parameters/imports, and the ReactNode mismatch in `apps/admin/src/app/layout.tsx`.

- [ ] **Step 2: Add the missing admin dev dependency**

Edit `apps/admin/package.json` so `devDependencies` includes `drizzle-kit`.

The resulting `devDependencies` block must contain:

```json
{
  "@tailwindcss/postcss": "^4.3.1",
  "@types/node": "^22.0.0",
  "@types/react": "^19.0.0",
  "@types/react-dom": "^19.0.0",
  "drizzle-kit": "^0.31.1",
  "tailwindcss": "^4.0.0",
  "typescript": "^5.7.2"
}
```

Run:

```bash
pnpm install --lockfile-only
```

Expected: `pnpm-lock.yaml` updates if the lockfile did not already include the admin importer dependency.

- [ ] **Step 3: Fix the root layout React type**

Replace `apps/admin/src/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ThemeProvider } from '@lynkko/ui'
import '@lynkko/ui/styles.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lynkko Platform',
  description: 'Administración centralizada del ecosistema Lynkko',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Remove unused admin route parameters**

For every `TS6133: 'req' is declared but its value is never read` in admin route handlers, rename the parameter to `_req`.

Example:

```ts
export async function POST(_req: NextRequest) {
  // existing body unchanged
}
```

Run:

```bash
pnpm --filter @lynkko/admin type-check
```

Expected: either PASS or a smaller list of unused imports/types.

- [ ] **Step 5: Remove unused imports and unused local types**

Apply these edits for the errors reported in the current branch:

```ts
// apps/admin/src/app/api/invoices/route.ts
// Remove this unused interface if the body is parsed dynamically:
interface InvoiceItem {
  app_id?: string
  subscription_id?: string
  description: string
  quantity?: number
  unit_price: number
}
```

```ts
// apps/admin/src/app/dashboard/marketplace/actions.ts
// If `eq` and `and` are still unused after edits, keep only:
import { db, platformSchema } from '@/lib/db'
```

```ts
// apps/admin/src/app/dashboard/tenants/[id]/ModulesTab.tsx
// Remove unused `PlatformModule` import and remove the unused `appId` parameter
// from the function where TypeScript reports it.
```

Use `pnpm --filter @lynkko/admin type-check` after each small group of edits.

- [ ] **Step 6: Verify monorepo type-check**

Run:

```bash
pnpm type-check
```

Expected: PASS. If a different package fails after admin is green, fix only the reported type errors and rerun.

- [ ] **Step 7: Commit baseline restoration**

Run:

```bash
git add apps/admin/package.json pnpm-lock.yaml apps/admin/src
git commit -m "chore: restore platform type-check baseline"
```

---

### Task 2: Add Certification Script Harness

**Files:**
- Create: `scripts/certification/check-env.mjs`
- Create: `scripts/certification/assert-package-exports.mjs`
- Modify: `package.json`
- Verify: `pnpm certification:exports`

- [ ] **Step 1: Create the certification scripts directory**

Run:

```bash
mkdir -p scripts/certification
```

- [ ] **Step 2: Add environment preflight script**

Create `scripts/certification/check-env.mjs`:

```js
const groups = {
  platform: ['PLATFORM_API_URL', 'PLATFORM_API_KEY'],
  audit: ['AUDIT_URL', 'AUDIT_API_KEY'],
  notifications: ['NOTIFICATIONS_URL', 'NOTIFICATIONS_API_KEY'],
}

let failed = false

for (const [group, keys] of Object.entries(groups)) {
  const missing = keys.filter((key) => !process.env[key])
  if (missing.length > 0) {
    failed = true
    console.error(`[certification:${group}] missing ${missing.join(', ')}`)
  } else {
    console.log(`[certification:${group}] ok`)
  }
}

if (failed) {
  process.exit(1)
}
```

- [ ] **Step 3: Add package export assertion script**

Create `scripts/certification/assert-package-exports.mjs`:

```js
const checks = [
  {
    packageName: '@lynkko/platform',
    importPath: '../packages/platform/dist/index.mjs',
    exports: ['createPlatformHttpClient'],
  },
  {
    packageName: '@lynkko/audit',
    importPath: '../packages/audit/dist/index.mjs',
    exports: ['createAuditHttpClient'],
  },
  {
    packageName: '@lynkko/notifications',
    importPath: '../packages/notifications/dist/index.mjs',
    exports: ['createNotificationsHttpClient'],
  },
]

let failed = false

for (const check of checks) {
  const mod = await import(new URL(check.importPath, import.meta.url))
  for (const exportName of check.exports) {
    if (typeof mod[exportName] !== 'function') {
      failed = true
      console.error(`[${check.packageName}] missing function export ${exportName}`)
    } else {
      console.log(`[${check.packageName}] ${exportName} ok`)
    }
  }
}

if (failed) {
  process.exit(1)
}
```

- [ ] **Step 4: Add certification scripts to root package.json**

Update the root `package.json` scripts block to include:

```json
{
  "build": "turbo build",
  "dev": "turbo dev",
  "lint": "turbo lint",
  "type-check": "turbo type-check",
  "clean": "turbo clean && rm -rf node_modules",
  "certification:env": "node scripts/certification/check-env.mjs",
  "certification:exports": "pnpm --filter @lynkko/platform build && pnpm --filter @lynkko/audit build && pnpm --filter @lynkko/notifications build && node scripts/certification/assert-package-exports.mjs"
}
```

- [ ] **Step 5: Verify package export checks pass**

Run:

```bash
pnpm certification:exports
```

Expected:

```text
[@lynkko/platform] createPlatformHttpClient ok
[@lynkko/audit] createAuditHttpClient ok
[@lynkko/notifications] createNotificationsHttpClient ok
```

- [ ] **Step 6: Commit certification harness**

Run:

```bash
git add package.json scripts/certification/check-env.mjs scripts/certification/assert-package-exports.mjs
git commit -m "chore: add platform certification scripts"
```

---

### Task 3: Add Live Smoke Tests for Platform and Services

**Files:**
- Create: `scripts/certification/smoke-platform-v1.mjs`
- Create: `scripts/certification/smoke-services.mjs`
- Modify: `package.json`
- Verify: `pnpm certification:smoke:platform`, `pnpm certification:smoke:services`

- [ ] **Step 1: Add Platform API v1 smoke script**

Create `scripts/certification/smoke-platform-v1.mjs`:

```js
const baseUrl = process.env.PLATFORM_API_URL?.replace(/\/$/, '')
const apiKey = process.env.PLATFORM_API_KEY
const tenantId = process.env.CERTIFICATION_TENANT_ID

if (!baseUrl || !apiKey || !tenantId) {
  console.error('Missing PLATFORM_API_URL, PLATFORM_API_KEY, or CERTIFICATION_TENANT_ID')
  process.exit(1)
}

async function request(path, init = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    throw new Error(`${path} returned ${res.status}: ${text}`)
  }
  console.log(`[platform] ${path} ${res.status}`)
  return body
}

await request(`/api/v1/license?tenant_id=${encodeURIComponent(tenantId)}`)
await request(`/api/v1/subscription?tenant_id=${encodeURIComponent(tenantId)}`)
await request(`/api/v1/tenants/${encodeURIComponent(tenantId)}`)
await request(`/api/v1/invoices?tenant_id=${encodeURIComponent(tenantId)}`)
await request(`/api/v1/usage?tenant_id=${encodeURIComponent(tenantId)}`)
await request(`/api/v1/usage?tenant_id=${encodeURIComponent(tenantId)}`, {
  method: 'POST',
  body: JSON.stringify({ metrics: { certification_smoke: 1 } }),
})
```

- [ ] **Step 2: Add services smoke script**

Create `scripts/certification/smoke-services.mjs`:

```js
const auditUrl = process.env.AUDIT_URL?.replace(/\/$/, '')
const auditKey = process.env.AUDIT_API_KEY
const notificationsUrl = process.env.NOTIFICATIONS_URL?.replace(/\/$/, '')
const notificationsKey = process.env.NOTIFICATIONS_API_KEY
const tenantId = process.env.CERTIFICATION_TENANT_ID
const userId = process.env.CERTIFICATION_USER_ID ?? 'certification-user'

if (!auditUrl || !auditKey || !notificationsUrl || !notificationsKey || !tenantId) {
  console.error('Missing AUDIT_URL, AUDIT_API_KEY, NOTIFICATIONS_URL, NOTIFICATIONS_API_KEY, or CERTIFICATION_TENANT_ID')
  process.exit(1)
}

async function request(baseUrl, apiKey, path, init = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${baseUrl}${path} returned ${res.status}: ${text}`)
  }
  console.log(`[service] ${baseUrl}${path} ${res.status}`)
  return text ? JSON.parse(text) : null
}

await request(auditUrl, auditKey, '/api/health')
await request(auditUrl, auditKey, '/api/audit', {
  method: 'POST',
  body: JSON.stringify({
    tenantId,
    appId: 'platform',
    userId,
    action: 'certification.smoke',
    resource: 'platform_certification',
    resourceId: tenantId,
    metadata: { source: 'scripts/certification/smoke-services.mjs' },
  }),
})
await request(auditUrl, auditKey, `/api/audit?tenantId=${encodeURIComponent(tenantId)}&action=${encodeURIComponent('certification.smoke')}`)

await request(notificationsUrl, notificationsKey, '/api/health')
await request(notificationsUrl, notificationsKey, '/api/notifications', {
  method: 'POST',
  body: JSON.stringify({
    tenantId,
    userId,
    appId: 'platform',
    title: 'Certification smoke',
    body: 'Notifications service accepted a certification smoke notification.',
    type: 'system',
  }),
})
await request(notificationsUrl, notificationsKey, `/api/notifications?tenantId=${encodeURIComponent(tenantId)}&userId=${encodeURIComponent(userId)}`)
await request(notificationsUrl, notificationsKey, `/api/notifications/unread-count?tenantId=${encodeURIComponent(tenantId)}&userId=${encodeURIComponent(userId)}`)
```

- [ ] **Step 3: Add smoke scripts to root package.json**

Add these scripts:

```json
{
  "certification:smoke:platform": "node scripts/certification/smoke-platform-v1.mjs",
  "certification:smoke:services": "node scripts/certification/smoke-services.mjs"
}
```

- [ ] **Step 4: Verify missing environment fails clearly**

Run:

```bash
pnpm certification:smoke:platform
```

Expected without env:

```text
Missing PLATFORM_API_URL, PLATFORM_API_KEY, or CERTIFICATION_TENANT_ID
```

Run:

```bash
pnpm certification:smoke:services
```

Expected without env:

```text
Missing AUDIT_URL, AUDIT_API_KEY, NOTIFICATIONS_URL, NOTIFICATIONS_API_KEY, or CERTIFICATION_TENANT_ID
```

- [ ] **Step 5: Commit smoke scripts**

Run:

```bash
git add package.json scripts/certification/smoke-platform-v1.mjs scripts/certification/smoke-services.mjs
git commit -m "chore: add platform certification smoke tests"
```

---

### Task 4: Document Certification and Governance

**Files:**
- Create: `docs/CERTIFICATION.md`
- Create: `docs/GOVERNANCE.md`
- Modify: `docs/CAMBIOS_V3.md`
- Modify: `docs/ARCHITECTURE.md`
- Verify: `rg -n "CERTIFICATION|GOVERNANCE|certificada|ownership" docs`

- [ ] **Step 1: Create certification guide**

Create `docs/CERTIFICATION.md`:

```md
# Lynkko Platform Certification

This document defines when `lynkko-platform` is certified as the base for product migrations.

## Certified Scope

- Platform API v1 for license, subscription, tenant, invoices, and usage.
- Published HTTP SDK clients in `@lynkko/platform`, `@lynkko/audit`, and `@lynkko/notifications`.
- Operational `audit` and `notifications` services with their own Neon databases.
- Service registry entries for `audit` and `notifications`.
- Product adoption kit for webhook, cron sync, and local license cache.

## Required Commands

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm build
pnpm certification:exports
pnpm certification:env
pnpm certification:smoke:platform
pnpm certification:smoke:services
```

## Required Environment

```bash
PLATFORM_API_URL=https://platform.lynkko.co
PLATFORM_API_KEY=
AUDIT_URL=
AUDIT_API_KEY=
NOTIFICATIONS_URL=
NOTIFICATIONS_API_KEY=
CERTIFICATION_TENANT_ID=
CERTIFICATION_USER_ID=certification-user
```

## Definition of Done

- `pnpm type-check` passes.
- `pnpm build` passes.
- `pnpm certification:exports` passes.
- Platform API v1 smoke test passes against a certification tenant.
- Audit and notifications smoke test passes against the deployed services.
- `docs/GOVERNANCE.md` identifies the owner of each shared capability.
- `docs/ADOPTION_KIT.md` gives products a single integration path.
```

- [ ] **Step 2: Create governance map**

Create `docs/GOVERNANCE.md`:

```md
# Lynkko Ecosystem Governance

This map covers products plus Platform. Web/content repos are outside this governance phase.

## Platform Owns

- Tenants
- App access
- Product catalog
- Plan catalog
- Licenses
- Subscriptions
- Invoices and revenue state
- API keys
- Service registry
- Outbound platform webhooks

## Services Own

| Service | Owns |
|---|---|
| audit | Cross-app audit events, query API, retention/purge behavior |
| notifications | In-app notification inbox, unread counts, read state, retention/purge behavior |

## Products Own

| Product | Owns |
|---|---|
| PEC | Commercial execution, leads, pipeline, quotes, sales rooms, imports |
| Incentivos | Programs, participants, point transactions, challenges, rewards, redemptions, rankings |
| Turnflow | Queues, appointments, customers, establishments, local operations, vertical workflows |
| ClubPass | External memberships, loyalty programs, benefits, redemptions, wallet passes |

## Runtime Rule

Products must not call Platform on every hot request. Products read local cache and sync via webhook plus cron.

## Legacy Rule

Legacy repos can be used as functional reference or migration source. They must not receive new ecosystem architecture.
```

- [ ] **Step 3: Link docs from V3 architecture docs**

Append this section to `docs/CAMBIOS_V3.md`:

```md
## Certification Track

The current certification track is documented in:

- `docs/CERTIFICATION.md`
- `docs/GOVERNANCE.md`
- `docs/ADOPTION_KIT.md`

This track certifies Platform API v1, audit, and notifications before broader product adoption.
```

Append this section to `docs/ARCHITECTURE.md`:

```md
## Current Certification Track

Platform certification is tracked in `docs/CERTIFICATION.md`. Product/data ownership is tracked in `docs/GOVERNANCE.md`. Product integration steps are tracked in `docs/ADOPTION_KIT.md`.
```

- [ ] **Step 4: Verify documentation links**

Run:

```bash
rg -n "CERTIFICATION|GOVERNANCE|ADOPTION_KIT|certification track|Certification Track" docs
```

Expected: matches in `docs/CERTIFICATION.md`, `docs/GOVERNANCE.md`, `docs/CAMBIOS_V3.md`, and `docs/ARCHITECTURE.md`.

- [ ] **Step 5: Commit docs**

Run:

```bash
git add docs/CERTIFICATION.md docs/GOVERNANCE.md docs/CAMBIOS_V3.md docs/ARCHITECTURE.md
git commit -m "docs: define platform certification governance"
```

---

### Task 5: Document the Product Adoption Kit

**Files:**
- Create: `docs/ADOPTION_KIT.md`
- Modify: `docs/INTEGRACION_APP.md`
- Verify: `rg -n "webhook|platform-sync|license_events|createPlatformHttpClient" docs/ADOPTION_KIT.md docs/INTEGRACION_APP.md`

- [ ] **Step 1: Create adoption kit**

Create `docs/ADOPTION_KIT.md`:

```md
# Product Adoption Kit

Products adopt certified Platform through HTTP SDKs, webhook push, cron pull, and local cache.

## Required Environment

```bash
PLATFORM_API_URL=https://platform.lynkko.co
PLATFORM_API_KEY=
PLATFORM_WEBHOOK_SECRET=
CRON_SECRET=
AUDIT_URL=
AUDIT_API_KEY=
NOTIFICATIONS_URL=
NOTIFICATIONS_API_KEY=
```

## Required Local Cache Columns

Add these fields to the product's tenant table, adapting the table name to the product:

```sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS platform_tenant_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_sub_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS license_status TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS license_valid_until TIMESTAMP,
  ADD COLUMN IF NOT EXISTS active_modules JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS plan_limits JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_platform_sync TIMESTAMP;
```

## Required Local Events Table

```sql
CREATE TABLE IF NOT EXISTS license_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

## Adapter Shape

```ts
import { createPlatformHttpClient } from '@lynkko/platform'

export const platform = createPlatformHttpClient(
  process.env.PLATFORM_API_URL!,
  process.env.PLATFORM_API_KEY!,
)
```

## Webhook Route Shape

```ts
import { verifyWebhook } from '@lynkko/webhooks'
import { badRequest, ok, unauthorized } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('X-Lynkko-Signature')
  const timestampHeader = req.headers.get('X-Lynkko-Timestamp')
  const timestamp = timestampHeader ? Number(timestampHeader) : NaN

  if (!signature || !Number.isFinite(timestamp)) {
    return unauthorized('Missing webhook signature')
  }

  const valid = verifyWebhook(
    process.env.PLATFORM_WEBHOOK_SECRET!,
    rawBody,
    signature,
    timestamp,
  )

  if (!valid) return unauthorized('Invalid platform signature')

  const event = JSON.parse(rawBody)
  if (!event.tenant_id || !event.event) return badRequest('Invalid platform event')

  // Product implementation updates local tenant cache idempotently.
  return ok({ status: 'ok' })
}
```

## Cron Shape

```ts
import { ok, unauthorized } from '@lynkko/utils'
import type { NextRequest } from 'next/server'
import { platform } from '@/lib/integrations/platform'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return unauthorized('Invalid cron secret')
  }

  // Product implementation iterates tenants, calls platform.getLicense(), updates cache,
  // and calls platform.reportUsage().
  return ok({ status: 'ok' })
}
```

## Product Smoke Test

Each product must prove:

- License cache can be populated from `platform.getLicense(tenantId)`.
- A signed webhook updates the cache idempotently.
- Cron sync succeeds with `CRON_SECRET`.
- Product runtime can render with Platform unavailable by reading the last local cache.
```

- [ ] **Step 2: Link adoption kit from integration guide**

Add this paragraph near the top of `docs/INTEGRACION_APP.md`:

```md
> Certified path: new and migrated products should follow `docs/ADOPTION_KIT.md`.
> The certified path uses `PLATFORM_API_URL` + `PLATFORM_API_KEY`, never direct
> access to `PLATFORM_DATABASE_URL` for license reads or usage reporting.
```

- [ ] **Step 3: Verify adoption documentation**

Run:

```bash
rg -n "webhook|platform-sync|license_events|createPlatformHttpClient|PLATFORM_DATABASE_URL" docs/ADOPTION_KIT.md docs/INTEGRACION_APP.md
```

Expected: matches show the certified HTTP path and local cache pattern.

- [ ] **Step 4: Commit adoption kit**

Run:

```bash
git add docs/ADOPTION_KIT.md docs/INTEGRACION_APP.md
git commit -m "docs: add product platform adoption kit"
```

---

### Task 6: Certify Build, Exports, and Documentation

**Files:**
- Verify only unless failures require small focused fixes.

- [ ] **Step 1: Run full type-check**

Run:

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 2: Run full build**

Run:

```bash
pnpm build
```

Expected: PASS for all packages and apps.

- [ ] **Step 3: Run export certification**

Run:

```bash
pnpm certification:exports
```

Expected:

```text
[@lynkko/platform] createPlatformHttpClient ok
[@lynkko/audit] createAuditHttpClient ok
[@lynkko/notifications] createNotificationsHttpClient ok
```

- [ ] **Step 4: Run environment preflight without env**

Run:

```bash
pnpm certification:env
```

Expected without env: FAIL with explicit missing key names for Platform, audit, and notifications.

- [ ] **Step 5: Commit any verification fixes**

If the previous commands required fixes, commit them:

```bash
git add .
git commit -m "fix: complete platform certification verification"
```

If no files changed, do not create an empty commit.

---

### Task 7: Run Live Certification Against Deployed Services

**Files:**
- Verify only.

- [ ] **Step 1: Export certification environment**

Set public URLs directly and enter secrets interactively so they never land in shell history or git:

```bash
export PLATFORM_API_URL=https://platform.lynkko.co
read -rsp "PLATFORM_API_KEY: " PLATFORM_API_KEY; echo; export PLATFORM_API_KEY
export AUDIT_URL=https://audit.lynkko.co
read -rsp "AUDIT_API_KEY: " AUDIT_API_KEY; echo; export AUDIT_API_KEY
export NOTIFICATIONS_URL=https://notifications.lynkko.co
read -rsp "NOTIFICATIONS_API_KEY: " NOTIFICATIONS_API_KEY; echo; export NOTIFICATIONS_API_KEY
read -rp "CERTIFICATION_TENANT_ID: " CERTIFICATION_TENANT_ID; export CERTIFICATION_TENANT_ID
read -rp "CERTIFICATION_USER_ID: " CERTIFICATION_USER_ID; export CERTIFICATION_USER_ID
```

- [ ] **Step 2: Verify environment preflight**

Run:

```bash
pnpm certification:env
```

Expected:

```text
[certification:platform] ok
[certification:audit] ok
[certification:notifications] ok
```

- [ ] **Step 3: Run Platform API smoke test**

Run:

```bash
pnpm certification:smoke:platform
```

Expected: each `/api/v1` route logs an HTTP 200.

- [ ] **Step 4: Run audit and notifications smoke test**

Run:

```bash
pnpm certification:smoke:services
```

Expected: health, create, query, list, and unread-count requests return 200 or 201.

- [ ] **Step 5: Record live certification result**

Append the certification result to `docs/CERTIFICATION.md`:

```bash
{
  echo ""
  echo "## Latest Certification Run"
  echo ""
  echo "- Date: $(date +%F)"
  echo "- Commit: $(git rev-parse HEAD)"
  echo "- Platform API v1 smoke: passed"
  echo "- Audit service smoke: passed"
  echo "- Notifications service smoke: passed"
} >> docs/CERTIFICATION.md
```

Run:

```bash
git add docs/CERTIFICATION.md
git commit -m "docs: record platform certification run"
```

---

## Self-Review

Spec coverage:

- Platform as certified base: Tasks 2, 3, 4, 6, 7.
- Published HTTP contracts: Task 2 and Task 6.
- Operational audit/notifications: Task 3 and Task 7.
- Governance map: Task 4.
- Product adoption kit: Task 5.
- Turnflow/product runtime rule: Task 5 documents the reusable pattern; the actual Turnflow code migration belongs to a future product adoption plan.
- Baseline verification: Task 1 and Task 6.

Placeholder scan:

- The plan contains no empty-value markers, no empty task bodies, and no unbounded deferral instructions.

Type consistency:

- Script names in `package.json` match file names under `scripts/certification`.
- Environment variable names are consistent across scripts and docs.
- HTTP client function names match current package exports: `createPlatformHttpClient`, `createAuditHttpClient`, `createNotificationsHttpClient`.

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-06-30-platform-certification.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.
