# Complete Platform API Reference

## Overview

This document lists all APIs implemented across Phase 1 and Phase 2 of the Platform integration.

---

## Quick Navigation

| Phase | Feature | Endpoints |
|-------|---------|-----------|
| 0 | Turnflow Integration | 2 endpoints |
| 1 | Marketplace & Modules | 4 endpoints |
| 2 | Plans & Subscriptions | 8 endpoints |
| 2 | Invoicing | 5 endpoints |
| **Total** | | **19 endpoints** |

---

## Phase 0: Turnflow Integration (Core)

These endpoints are called by Turnflow's cron job (nightly sync).

### GET `/api/apps/turnflow/subscription?tenant_id={tenantId}`
- **Called by:** Turnflow cron sync (3am UTC)
- **Purpose:** Fetch current subscription and plan for tenant
- **Auth:** Bearer token (PLATFORM_API_KEY)
- **Response:** Subscription, plan, modules, period_end
- **Docs:** PLATFORM_TURNFLOW_INTEGRATION.md

### POST `/api/apps/turnflow/status-report`
- **Called by:** Turnflow cron sync
- **Purpose:** Report daily metrics to platform
- **Auth:** Bearer token (PLATFORM_API_KEY)
- **Body:** tenant_id, metrics (active_users, records_created, etc)
- **Storage:** Stored in usage_records table
- **Docs:** PLATFORM_TURNFLOW_INTEGRATION.md

---

## Phase 1: Marketplace & Module Management

These endpoints manage the centralized marketplace and module access control.

### GET `/api/marketplace/{tenantId}`
- **Purpose:** Centralized marketplace view for all apps
- **Called by:** Turnflow, PEC, and other apps
- **Auth:** Optional (public, but should add API key validation)
- **Response:** All apps, modules, subscriptions, access status
- **Use case:** "What apps and features does this tenant have?"
- **Docs:** MARKETPLACE_API.md

### GET `/api/tenants/{tenantId}/modules?app_id={appId}`
- **Purpose:** List modules for an app with tenant's access status
- **Auth:** Session (admin only)
- **Query:** app_id (optional, filter by app)
- **Response:** Modules array with is_enabled flag
- **Use case:** "Show me all Turnflow modules and their status"
- **Docs:** MARKETPLACE_API.md

### POST `/api/tenants/{tenantId}/modules/{moduleId}/toggle`
- **Purpose:** Enable/disable a module for tenant
- **Auth:** Session (admin only)
- **Body:** { enabled: boolean }
- **Webhook:** Sends module_enabled or module_disabled
- **Use case:** "Allow tenant to use Pagos module"
- **Docs:** MARKETPLACE_API.md, PHASE_1_COMPLETE.md

### POST `/api/tenants/{tenantId}/apps/{appId}/toggle`
- **Purpose:** Enable/disable an app for tenant
- **Auth:** Session (admin only)
- **Body:** { enabled: boolean }
- **Webhook:** Sends app_enabled or app_disabled with full context
- **Use case:** "Activate Turnflow for this tenant"
- **Docs:** MARKETPLACE_API.md, PHASE_1_COMPLETE.md

---

## Phase 2a: Plan Management

Complete CRUD for billing plans.

### GET `/api/plans?app_id={appId}`
- **Purpose:** List all plans (optionally filtered by app)
- **Auth:** Session (admin only)
- **Query:** app_id (optional)
- **Response:** Plans array with all details
- **Docs:** BILLING_API.md

### POST `/api/plans`
- **Purpose:** Create a new plan
- **Auth:** Session (admin only)
- **Body:** app_id, slug, name, prices, features, seats, etc
- **Validation:** slug unique per app
- **Response:** Created plan object
- **Docs:** BILLING_API.md

### PUT `/api/plans/{planId}`
- **Purpose:** Update an existing plan
- **Auth:** Session (admin only)
- **Body:** name, prices, features, status, etc (all optional)
- **Response:** Updated plan object
- **Docs:** BILLING_API.md

### DELETE `/api/plans/{planId}`
- **Purpose:** Delete a plan
- **Auth:** Session (admin only)
- **Behavior:** Hard delete if no subscriptions, soft delete otherwise
- **Response:** deleted or soft_deleted status
- **Docs:** BILLING_API.md

---

## Phase 2b: Subscription Management

Manage subscription lifecycle.

### POST `/api/subscriptions`
- **From Phase 0:** Create subscription (already implemented)
- **Behavior:** Creates subscription and enables app for tenant
- **Webhook:** Sends subscription_activated
- **Docs:** PLATFORM_TURNFLOW_INTEGRATION.md

### PUT `/api/subscriptions/{subscriptionId}/update`
- **Purpose:** Change plan or seats on subscription
- **Auth:** Session (admin only)
- **Body:** { plan_id?: string, seats?: number }
- **Webhook:** Sends plan_changed or subscription_updated
- **Response:** Update details with from/to values
- **Docs:** BILLING_API.md

### POST `/api/subscriptions/{subscriptionId}/cancel`
- **Purpose:** Cancel a subscription
- **Auth:** Session (admin only)
- **Body:** { reason?: string, immediate?: boolean }
- **Webhook:** Sends subscription_canceled
- **Response:** canceled_at timestamp, reason
- **Docs:** BILLING_API.md

---

## Phase 2c: Invoice Management

Handle invoicing and payment tracking.

### POST `/api/invoices`
- **Purpose:** Create an invoice for a tenant
- **Auth:** Session (admin only)
- **Body:** tenant_id, items[], currency, tax, notes, due_date
- **Auto-fields:** number (INV-YYYYMMDD-XXXX), timestamps
- **Response:** Invoice with ID and line items count
- **Docs:** BILLING_API.md

### GET `/api/invoices?tenant_id={id}&status={status}&limit={n}`
- **Purpose:** List invoices with filtering
- **Auth:** Session (admin only)
- **Query:** tenant_id (optional), status (optional), limit (default 50)
- **Response:** Invoices array
- **Docs:** BILLING_API.md

### GET `/api/invoices/{invoiceId}`
- **Purpose:** Get invoice with all line items
- **Auth:** Session (admin only)
- **Response:** Invoice + items array
- **Docs:** BILLING_API.md

### PUT `/api/invoices/{invoiceId}`
- **Purpose:** Update invoice metadata
- **Auth:** Session (admin only)
- **Body:** { status?: string, due_date?: string, notes?: string }
- **Valid statuses:** draft, open, paid, void
- **Response:** Updated invoice
- **Docs:** BILLING_API.md

### POST `/api/invoices/{invoiceId}` (Mark Paid)
- **Purpose:** Mark invoice as paid with payment details
- **Auth:** Session (admin only)
- **Body:** { wompi_transaction_id?: string, payment_method?: object }
- **Updates:** status=paid, paidAt=now(), wompi fields
- **Response:** Invoice with payment details
- **Docs:** BILLING_API.md

---

## Webhook Events

All webhooks are HMAC-SHA256 signed and sent asynchronously.

### Subscription Events
| Event | When | Sent By | Context |
|-------|------|---------|---------|
| subscription_activated | New subscription created | POST /api/subscriptions/create | plan, modules, period_end |
| plan_changed | Plan upgraded/downgraded | PUT /api/subscriptions/{id}/update | old→new plan |
| subscription_updated | Seats or other details changed | PUT /api/subscriptions/{id}/update | changes details |
| subscription_canceled | Subscription terminated | POST /api/subscriptions/{id}/cancel | reason, period_end |

### Module Events
| Event | When | Sent By |
|-------|------|---------|
| module_enabled | Module activated for tenant | POST /api/tenants/{id}/modules/{id}/toggle |
| module_disabled | Module deactivated for tenant | POST /api/tenants/{id}/modules/{id}/toggle |

### App Events
| Event | When | Sent By |
|-------|------|---------|
| app_enabled | App activated for tenant | POST /api/tenants/{id}/apps/{id}/toggle |
| app_disabled | App deactivated for tenant | POST /api/tenants/{id}/apps/{id}/toggle |

---

## Authentication & Authorization

### Session-based (Dashboard)
- Requires superadmin session
- Enforced via `requireSuperadmin()` in server actions
- Used by: Plan CRUD, Subscription management, Invoicing

### Bearer Token (App-to-Platform)
- PLATFORM_API_KEY environment variable
- Used by: Turnflow cron (to fetch subscription, report status)
- Header: `Authorization: Bearer {PLATFORM_API_KEY}`

### Webhook Signing
- All webhooks signed with HMAC-SHA256
- Secret: PLATFORM_WEBHOOK_SECRET
- Headers: X-Platform-Signature, X-Platform-Timestamp
- Receiver verifies signature before processing

---

## Error Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | Success | Request completed |
| 400 | Bad Request | Invalid parameters, validation failed |
| 404 | Not Found | Resource doesn't exist |
| 401 | Unauthorized | Missing/invalid credentials |
| 500 | Server Error | Internal error |

---

## Response Format

### Success (200)
```json
{
  "status": "ok|created|updated|deleted|paid|canceled",
  "data": { ... }  or individual fields
}
```

### Error (4xx, 5xx)
```json
{
  "error": "Human-readable message",
  "status": 400
}
```

---

## Rate Limiting

None currently implemented (can be added in Phase 3).

---

## Pagination

Only `/api/invoices` supports pagination:
- `limit` query param (default: 50, max: 500)
- Results ordered by createdAt DESC

---

## Caching

- Marketplace can be cached client-side (5-minute TTL recommended)
- Turnflow uses ISR for efficiency
- Platform doesn't cache—all reads are real-time from DB

---

## Server Actions (Dashboard UI)

All server actions validate superadmin session and call corresponding APIs:

```
plans/actions.ts
├── createPlanAction()
├── updatePlanAction()
└── deletePlanAction()

subscriptions/actions.ts
├── updateSubscriptionAction()
└── cancelSubscriptionAction()

billing/actions.ts
├── createInvoiceAction()
├── updateInvoiceAction()
└── markInvoicePaidAction()

tenants/[id]/modules-actions.ts
├── toggleModuleAction()
└── toggleAppAction()
```

---

## Testing Commands

See BILLING_API.md for complete curl examples.

Quick test:
```bash
# List plans
curl http://localhost:3000/api/plans?app_id=turnflow

# Create invoice
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"t1","items":[{"description":"Test","unit_price":5000000}]}'

# List invoices
curl http://localhost:3000/api/invoices?status=open
```

---

## Implementation Status

| Endpoint | Phase | Status | Tests |
|----------|-------|--------|-------|
| GET /api/apps/turnflow/subscription | 0 | ✅ Complete | Via Turnflow cron |
| POST /api/apps/turnflow/status-report | 0 | ✅ Complete | Via Turnflow cron |
| GET /api/marketplace/{tenantId} | 1 | ✅ Complete | Manual API test |
| GET /api/tenants/{id}/modules | 1 | ✅ Complete | Dashboard UI |
| POST /api/tenants/{id}/modules/{id}/toggle | 1 | ✅ Complete | Dashboard UI |
| POST /api/tenants/{id}/apps/{id}/toggle | 1 | ✅ Complete | Dashboard UI |
| GET /api/plans | 2 | ✅ Complete | API test |
| POST /api/plans | 2 | ✅ Complete | API test |
| PUT /api/plans/{id} | 2 | ✅ Complete | API test |
| DELETE /api/plans/{id} | 2 | ✅ Complete | API test |
| PUT /api/subscriptions/{id}/update | 2 | ✅ Complete | API test |
| POST /api/subscriptions/{id}/cancel | 2 | ✅ Complete | API test |
| POST /api/invoices | 2 | ✅ Complete | API test |
| GET /api/invoices | 2 | ✅ Complete | API test |
| GET /api/invoices/{id} | 2 | ✅ Complete | API test |
| PUT /api/invoices/{id} | 2 | ✅ Complete | API test |
| POST /api/invoices/{id} (mark paid) | 2 | ✅ Complete | API test |

---

## Documentation

- **PLATFORM_TURNFLOW_INTEGRATION.md** — Phase 0 setup and Turnflow-specific details
- **MARKETPLACE_API.md** — Phase 1 marketplace and module APIs
- **BILLING_API.md** — Phase 2 plans, subscriptions, invoicing
- **PHASE_1_COMPLETE.md** — Testing guide for Phase 1
- **PHASE_2_COMPLETE.md** — Testing guide for Phase 2
- **This file (API_REFERENCE.md)** — Master reference

---

## Next Steps (Phase 3)

- [ ] API key authentication (instead of session-based)
- [ ] Webhook retry queue and delivery status
- [ ] Auto-invoice generation on billing date
- [ ] Automatic Wompi payment processing
- [ ] Revenue dashboard and reports
- [ ] Audit trail table
- [ ] Rate limiting per tenant/app
- [ ] Usage analytics
