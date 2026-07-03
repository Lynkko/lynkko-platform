# Product Adoption Kit

Products adopt certified Platform through HTTP SDKs, webhook push, cron pull, and local cache.

## Required Environment

```bash
PLATFORM_API_URL=https://platform.lynkko.co
PLATFORM_API_KEY=
PLATFORM_WEBHOOK_SECRET=
CRON_SECRET=
AUTH_URL=
AUTH_SERVICE_API_KEY=
AUDIT_URL=
AUDIT_API_KEY=
NOTIFICATIONS_URL=
NOTIFICATIONS_API_KEY=
COMMS_URL=
COMMS_API_KEY=
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
import { createAuditHttpClient } from '@lynkko/audit'
import { createNotificationsHttpClient } from '@lynkko/notifications'
import { createCommsHttpClient } from '@lynkko/comms'

export const platform = createPlatformHttpClient(
  process.env.PLATFORM_API_URL!,
  process.env.PLATFORM_API_KEY!,
)

export const audit = createAuditHttpClient(
  process.env.AUDIT_URL!,
  process.env.AUDIT_API_KEY!,
)

export const notifications = createNotificationsHttpClient(
  process.env.NOTIFICATIONS_URL!,
  process.env.NOTIFICATIONS_API_KEY!,
)

export const comms = createCommsHttpClient(
  process.env.COMMS_URL!,
  process.env.COMMS_API_KEY!,
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

  const payload = JSON.parse(rawBody) as { event?: string; tenant_id?: string }
  if (!payload.event || !payload.tenant_id) return badRequest('Invalid platform event')

  // Product implementation updates local tenant cache idempotently.
  return ok({ status: 'ok' })
}
```

Certified webhook delivery uses `X-Lynkko-*` headers from `@lynkko/webhooks`. Legacy `X-Platform-*` senders must be migrated to this contract or handled by an explicit compatibility adapter.

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
- Product workflow can write required audit events through Audit.
- Product workflow can create in-app notifications through Notifications.
- Product workflow can send transactional email/push through Comms when configured.
