# Turnflow Platform Integration — Implementation Status

## Overview
The lynkko-platform now provides the necessary APIs and infrastructure for Turnflow's subscription management and licensing integration.

---

## ✅ Completed Components

### 1. Core API Endpoints for Turnflow

#### GET `/api/apps/turnflow/subscription`
- **Purpose:** Fetches current subscription and plan details for a tenant
- **Called by:** Turnflow's nightly cron job (3am UTC)
- **Authentication:** Bearer token (PLATFORM_API_KEY)
- **Response:**
  ```json
  {
    "subscription": {
      "id": "sub_xxx",
      "active_modules": { "module_slug": true, ... },
      "status": "active|trialing|past_due|canceled",
      "period_end": "2026-07-21T00:00:00Z",
      "seats": 1
    },
    "plan": {
      "id": "plan_xxx",
      "name": "Pro",
      "slug": "pro",
      "features": ["feature1", "feature2", ...]
    }
  }
  ```

#### POST `/api/apps/turnflow/status-report`
- **Purpose:** Receives metrics from Turnflow's cron job
- **Authentication:** Bearer token (PLATFORM_API_KEY)
- **Payload:**
  ```json
  {
    "tenant_id": "tenant_xxx",
    "subscription_id": "sub_xxx",
    "license_status": "valid|expired",
    "license_valid_until": "2026-07-21T00:00:00Z",
    "metrics": {
      "active_users": 5,
      "records_created": 150,
      "appointments_total": 320
    },
    "active_modules": { "module_slug": true, ... },
    "reported_at": "2026-06-21T03:15:00Z"
  }
  ```
- **Storage:** Metrics are stored in `usage_records` table (one entry per metric per day)

#### POST `/api/subscriptions/create`
- **Purpose:** Creates or updates a subscription for a tenant
- **Response:** Returns subscription details and sends webhook to Turnflow
- **Webhook Event:** `subscription_activated` (or `plan_changed` if updating)

### 2. Webhook Infrastructure

#### Webhook Utility (`src/lib/webhooks.ts`)
- HMAC-SHA256 signing for webhook payloads
- Async webhook delivery to apps
- Supports events:
  - `subscription_activated`: New subscription created
  - `plan_changed`: Subscription plan updated
  - `subscription_suspended`: Subscription paused
  - `subscription_canceled`: Subscription cancelled

#### Webhook Format (Turnflow receives)
```json
{
  "event": "subscription_activated|plan_changed|subscription_suspended|subscription_canceled",
  "tenant_id": "tenant_xxx",
  "subscription_id": "sub_xxx",
  "plan": { "id": "...", "name": "...", "slug": "..." },
  "active_modules": { "module_slug": true, ... },
  "period_end": "2026-07-21T00:00:00Z"
}
```

### 3. Turnflow Plans and Modules

#### Plans (3 tier model)
- **Starter:** $299/month — for small businesses
  - Features: basic_scheduling, customer_management, basic_reporting
  
- **Pro:** $799/month — for growing businesses
  - Features: advanced_scheduling, customer_management, advanced_reporting, team_management, api_access, custom_branding
  
- **Enterprise:** Custom pricing — for large enterprises
  - All features plus white_label, priority_support, sso

#### Modules (11 total)
- `basic_scheduling` — Basic shift/appointment system
- `advanced_scheduling` — Advanced rules and automation
- `customer_management` — CRM for customers
- `basic_reporting` — Standard operational reports
- `advanced_reporting` — Deep analytics and dashboards
- `team_management` — Employee management
- `api_access` — REST API access
- `custom_branding` — Color and branding customization
- `white_label` — Complete white label solution
- `priority_support` — 24/7 priority support
- `sso` — Single sign-on integration

### 4. Environment Variables

Platform `.env.example`:
```
PLATFORM_DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...
PLATFORM_API_KEY=sk_platform_xxx        # For API authentication
PLATFORM_WEBHOOK_SECRET=wh_secret_xxx   # For webhook signing
```

Turnflow `.env.example` (updated):
```
PLATFORM_URL=https://api.platform.lynkko.co
PLATFORM_API_KEY=sk_turnflow_xxx        # Bearer token for platform APIs
PLATFORM_WEBHOOK_SECRET=wh_secret_xxx   # For verifying platform webhooks
```

### 5. Turnflow Cron Job (Already Implemented in Turnflow)

The nightly sync job at `/api/cron/sync-licenses`:
1. Iterates all active brands with platform_tenant_id
2. Calls GET `/api/apps/turnflow/subscription` to refresh license cache
3. Calculates metrics (active_users, records_created, appointments_total)
4. Calls POST `/api/apps/turnflow/status-report` to report metrics
5. Updates local cache with subscription status and active modules

---

## 🔄 Integration Flow

### Real-time Activation (Webhook-based)
1. Superadmin activates Turnflow for tenant via Superadmin UI
2. Platform creates subscription via POST `/api/subscriptions/create`
3. Platform sends webhook `subscription_activated` to Turnflow
4. Turnflow's webhook endpoint caches subscription locally
5. User can immediately access Turnflow

### Nightly Sync (Cron-based)
1. Turnflow cron runs at 3am UTC
2. Calls GET `/api/apps/turnflow/subscription` to fetch latest
3. Updates local cache (plan, modules, expiration date)
4. Calculates daily metrics
5. Calls POST `/api/apps/turnflow/status-report` with metrics
6. Platform stores metrics in `usage_records` table

### License Validation (Per-request)
1. User requests page in Turnflow
2. Middleware checks local cache: `brand.licenseStatus`
3. If 'valid' or 'grace' → allow access
4. Otherwise → redirect to `/app-access-denied`
5. No network calls (zero-latency validation)

---

## 🚀 Deployment & Testing Checklist

### Prerequisites
- [ ] Platform migrations applied (0000_platform_init.sql, 0001_billing.sql, 0002_turnflow_plans.sql)
- [ ] Environment variables set in both platform and Turnflow
- [ ] PLATFORM_WEBHOOK_SECRET matches in both apps
- [ ] Turnflow has PLATFORM_URL pointing to platform API

### Testing Steps
1. **Create Test Tenant**
   ```bash
   # Via Superadmin admin or seed script
   POST /api/subscriptions/create {
     "tenant_id": "test_tenant_1",
     "app_id": "turnflow",
     "plan_id": "plan_turnflow_pro"
   }
   ```

2. **Verify Webhook Received**
   - Check Turnflow logs for `POST /api/platform/webhook`
   - Verify HMAC signature validation passed
   - Check `brands` table cache updated

3. **Run Cron Job Manually**
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     http://localhost:3000/api/cron/sync-licenses
   ```
   - Verify response: `{ status: 'sync_completed', synced: 1, ... }`
   - Check `usage_records` table for metrics

4. **Access Turnflow**
   - Login as brand user
   - Verify middleware check passes
   - Verify theme applied (if configured)
   - Check `/app-access-denied` redirects work when license is expired

5. **Modify Subscription**
   ```bash
   POST /api/subscriptions/create {
     "tenant_id": "test_tenant_1",
     "app_id": "turnflow",
     "plan_id": "plan_turnflow_enterprise"
   }
   ```
   - Should send `plan_changed` webhook
   - Turnflow should update cached modules

---

## 📋 Remaining Optional Features

### Phase 2 (Future)
- [ ] Superadmin UI for subscription management
- [ ] Webhook event history/logging table
- [ ] Retry logic for failed webhook deliveries
- [ ] Webhook delivery status tracking
- [ ] Subscription cancellation endpoint
- [ ] Invoice/billing integration
- [ ] Usage analytics dashboard
- [ ] Plan upgrade/downgrade workflow

### Monitoring & Observability
- [ ] Webhook delivery logs
- [ ] Metrics dashboard
- [ ] License expiration alerts
- [ ] Subscription status reporting

---

## 📁 File Locations

### Platform Files
- `/apps/admin/src/app/api/apps/turnflow/subscription/route.ts` — GET endpoint
- `/apps/admin/src/app/api/apps/turnflow/status-report/route.ts` — POST endpoint
- `/apps/admin/src/app/api/subscriptions/create/route.ts` — Subscription management
- `/apps/admin/src/lib/webhooks.ts` — Webhook utilities
- `/apps/admin/.env.example` — Environment variables
- `/apps/admin/drizzle/0002_turnflow_plans.sql` — Seed data

### Turnflow Files (Already Updated)
- `/src/app/api/cron/sync-licenses/route.ts` — Fixed PLATFORM_URL variable
- `/src/app/api/platform/webhook/route.ts` — Already implemented
- `/src/middleware.ts` — License validation in middleware
- `/src/app/app-access-denied/page.tsx` — Access denied page
- `/src/lib/licensing.ts` — License utilities
- `.env.example` — Updated with platform vars

---

## 🔐 Security Notes

1. **API Authentication**
   - All platform endpoints protected by PLATFORM_API_KEY
   - Only Turnflow (with correct key) can call subscription endpoints
   - Keys should be different between dev/staging/prod

2. **Webhook Signing**
   - All webhooks signed with HMAC-SHA256
   - Timestamp included to prevent replay attacks
   - Turnflow verifies signature before processing

3. **No RLS in Platform Database**
   - Platform tables don't use Postgres RLS
   - All queries must include proper WHERE clauses
   - SaaS multi-tenant isolation via tenant_id column

4. **Environment Variables**
   - PLATFORM_API_KEY: Store securely in Vercel/deployment
   - PLATFORM_WEBHOOK_SECRET: Share between apps, keep secret
   - PLATFORM_URL: Must be HTTPS in production

---

## 🆘 Troubleshooting

### Webhook Not Received
1. Check Turnflow PLATFORM_WEBHOOK_SECRET matches platform
2. Verify Turnflow webhook endpoint is accessible
3. Check signature validation in Turnflow logs
4. Inspect `X-Platform-Signature` and `X-Platform-Timestamp` headers

### Cron Sync Fails
1. Verify PLATFORM_URL is correct
2. Check PLATFORM_API_KEY is valid
3. Ensure subscriptions exist for the tenant
4. Check platform `/api/apps/turnflow/subscription` responds correctly

### License Status Not Updating
1. Verify webhook was received and processed
2. Check `brands.licenseStatus` in Turnflow DB
3. Verify `license_events` table for audit trail
4. Check middleware is reading correct cache columns

---

## 📞 Support

For issues with the platform integration:
1. Check webhook delivery logs (platform side)
2. Check license event audit trail (Turnflow side)
3. Manually call GET subscription endpoint to verify plan data
4. Review environment variables for typos or mismatches
