# Billing & Subscription Management API

## Overview

The Platform now has complete billing and subscription management capabilities:
- Plan CRUD operations
- Subscription lifecycle management
- Invoice generation and payment tracking
- Webhook notifications for billing events

---

## Plans Management

### GET `/api/plans`

List all plans, optionally filtered by app.

**Query Parameters:**
- `app_id` (optional) — Filter by app (e.g., "turnflow")

**Response:**
```json
{
  "plans": [
    {
      "id": "plan_1",
      "appId": "turnflow",
      "slug": "pro",
      "name": "Pro",
      "description": "For growing businesses",
      "monthlyPrice": 9900000,
      "annualPrice": 7900000,
      "currency": "COP",
      "maxSeats": 5,
      "features": ["clientes", "citas", "pagos"],
      "isPublic": true,
      "sortOrder": 1,
      "isActive": true,
      "createdAt": "2026-06-21T10:30:00Z"
    }
  ],
  "total": 1,
  "filtered_by_app": "turnflow"
}
```

### POST `/api/plans`

Create a new plan.

**Body:**
```json
{
  "app_id": "turnflow",
  "slug": "enterprise",
  "name": "Enterprise",
  "description": "For large organizations",
  "monthly_price": 19900000,
  "annual_price": 15900000,
  "currency": "COP",
  "max_seats": null,
  "features": ["clientes", "citas", "pagos", "reportes"],
  "is_public": false,
  "sort_order": 3,
  "is_active": true
}
```

**Response:**
```json
{
  "status": "created",
  "plan": {
    "id": "plan_enterprise",
    "appId": "turnflow",
    "slug": "enterprise",
    "name": "Enterprise",
    ...
  }
}
```

### PUT `/api/plans/{planId}`

Update an existing plan.

**Body:** (all fields optional)
```json
{
  "name": "Enterprise Pro",
  "description": "Updated description",
  "monthly_price": 24900000,
  "annual_price": 19900000,
  "max_seats": 10,
  "features": ["clientes", "citas", "pagos", "reportes", "offline"],
  "is_active": true
}
```

**Response:**
```json
{
  "status": "updated",
  "plan": { ... }
}
```

### DELETE `/api/plans/{planId}`

Delete a plan. If the plan has active subscriptions, it's soft-deleted (marked as inactive).

**Response:**
```json
{
  "status": "deleted",
  "plan_id": "plan_1"
}
```

Or if soft-deleted:
```json
{
  "status": "soft_deleted",
  "reason": "Plan has active subscriptions. Marked as inactive.",
  "plan_id": "plan_1"
}
```

---

## Subscription Management

### POST `/api/subscriptions/{subscriptionId}/update`

Update a subscription (change plan or seats).

**Body:**
```json
{
  "plan_id": "plan_pro",
  "seats": 10
}
```

**Webhooks Sent:**
- `plan_changed` — if plan was updated
- `subscription_updated` — if only seats changed

**Response:**
```json
{
  "status": "updated",
  "subscription_id": "sub_1",
  "changes": {
    "plan": {
      "from": "starter",
      "to": "pro"
    },
    "seats": {
      "from": 5,
      "to": 10
    }
  },
  "webhook_sent": true
}
```

### POST `/api/subscriptions/{subscriptionId}/cancel`

Cancel a subscription.

**Body:**
```json
{
  "reason": "Customer requested cancellation",
  "immediate": true
}
```

**Parameters:**
- `immediate` (default: true) — Cancel immediately or at period end
- `reason` (optional) — Reason for cancellation

**Webhook Sent:**
- `subscription_canceled`

**Response:**
```json
{
  "status": "canceled",
  "subscription_id": "sub_1",
  "tenant_id": "tenant_123",
  "canceled_at": "2026-06-21T10:30:00Z",
  "immediate": true,
  "webhook_sent": true
}
```

---

## Invoices

### POST `/api/invoices`

Create an invoice for a tenant.

**Body:**
```json
{
  "tenant_id": "tenant_123",
  "items": [
    {
      "app_id": "turnflow",
      "subscription_id": "sub_1",
      "description": "Turnflow Pro (June 2026)",
      "quantity": 1,
      "unit_price": 9900000
    },
    {
      "description": "Additional seats (5 × $50k)",
      "quantity": 5,
      "unit_price": 500000
    }
  ],
  "currency": "COP",
  "tax": 1890000,
  "notes": "Monthly billing - June 2026",
  "due_date": "2026-07-05"
}
```

**Response:**
```json
{
  "status": "created",
  "invoice": {
    "id": "inv_1",
    "number": "INV-20260621-ABC1",
    "tenant_id": "tenant_123",
    "status": "open",
    "subtotal": 12400000,
    "tax": 1890000,
    "total": 14290000,
    "currency": "COP",
    "due_date": "2026-07-05T00:00:00Z",
    "created_at": "2026-06-21T10:30:00Z"
  },
  "items_count": 2
}
```

### GET `/api/invoices`

List invoices.

**Query Parameters:**
- `tenant_id` (optional) — Filter by tenant
- `status` (optional) — Filter by status (draft, open, paid, void)
- `limit` (default: 50) — Result limit

**Response:**
```json
{
  "invoices": [
    {
      "id": "inv_1",
      "number": "INV-20260621-ABC1",
      "tenantId": "tenant_123",
      "status": "open",
      "subtotal": 12400000,
      "tax": 1890000,
      "total": 14290000,
      "currency": "COP",
      "dueDate": "2026-07-05T00:00:00Z",
      "paidAt": null,
      "createdAt": "2026-06-21T10:30:00Z"
    }
  ],
  "total": 1,
  "filtered_by": {
    "tenant_id": "tenant_123",
    "status": null
  }
}
```

### GET `/api/invoices/{invoiceId}`

Get a specific invoice with line items.

**Response:**
```json
{
  "invoice": {
    "id": "inv_1",
    "number": "INV-20260621-ABC1",
    "tenantId": "tenant_123",
    "status": "open",
    "subtotal": 12400000,
    "tax": 1890000,
    "total": 14290000,
    "items": [
      {
        "id": "item_1",
        "invoiceId": "inv_1",
        "appId": "turnflow",
        "subscriptionId": "sub_1",
        "description": "Turnflow Pro (June 2026)",
        "quantity": 1,
        "unitPrice": 9900000,
        "amount": 9900000
      }
    ]
  }
}
```

### PUT `/api/invoices/{invoiceId}`

Update invoice (status, due date, notes).

**Body:**
```json
{
  "status": "paid",
  "due_date": "2026-07-10",
  "notes": "Updated notes"
}
```

**Response:**
```json
{
  "status": "updated",
  "invoice": { ... }
}
```

### POST `/api/invoices/{invoiceId}`

Mark an invoice as paid (with optional Wompi transaction details).

**Body:**
```json
{
  "wompi_transaction_id": "txn_12345",
  "payment_method": {
    "type": "CARD",
    "brand": "VISA",
    "last_four": "1234"
  }
}
```

**Response:**
```json
{
  "status": "paid",
  "invoice": {
    "id": "inv_1",
    "status": "paid",
    "paidAt": "2026-06-21T10:35:00Z",
    "wompiTransactionId": "txn_12345"
  }
}
```

---

## Webhooks

### New Events in Phase 2

| Event | Sent When | Payload |
|-------|-----------|---------|
| `plan_changed` | Subscription plan updated | subscription_id, plan, active_modules |
| `subscription_updated` | Subscription seats changed | subscription_id |
| `subscription_canceled` | Subscription cancelled | subscription_id, plan, period_end |

### Example Webhooks

**plan_changed:**
```json
{
  "event": "plan_changed",
  "tenant_id": "tenant_123",
  "subscription_id": "sub_1",
  "plan": {
    "id": "plan_pro",
    "name": "Pro",
    "slug": "pro"
  },
  "active_modules": {
    "clientes": true,
    "citas": true,
    "pagos": true
  },
  "period_end": "2026-07-21T00:00:00Z"
}
```

**subscription_canceled:**
```json
{
  "event": "subscription_canceled",
  "tenant_id": "tenant_123",
  "subscription_id": "sub_1",
  "plan": {
    "id": "plan_pro",
    "name": "Pro",
    "slug": "pro"
  },
  "period_end": "2026-07-21T00:00:00Z"
}
```

---

## Server Actions (for UI)

Dashboard uses these server actions for form submissions:

```typescript
// plans/actions.ts
updatePlanAction(planId, formData)
deletePlanAction(planId)

// subscriptions/actions.ts
updateSubscriptionAction(subscriptionId, planId?, seats?)
cancelSubscriptionAction(subscriptionId, reason?, immediate?)

// billing/actions.ts
createInvoiceAction(tenantId, items, options?)
updateInvoiceAction(invoiceId, data)
markInvoicePaidAction(invoiceId, wompiTransactionId?, paymentMethod?)
```

---

## Invoice Number Format

Invoices are auto-numbered using the pattern:
```
INV-{YYYYMMDD}-{RANDOM4}
Example: INV-20260621-ABC1
```

---

## Soft vs Hard Delete

**Hard Delete:** Only possible if no subscriptions reference the plan
**Soft Delete:** Plan marked as `isActive: false` if subscriptions exist

This ensures historical data integrity and audit trails.

---

## Error Handling

All endpoints return appropriate HTTP status codes:

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 404 | Resource not found |
| 500 | Server error |

Example error response:
```json
{
  "error": "Plan with slug 'pro' already exists for this app",
  "status": 400
}
```

---

## Testing

```bash
# Create a plan
curl -X POST http://localhost:3000/api/plans \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "turnflow",
    "slug": "test-plan",
    "name": "Test Plan",
    "monthly_price": 5000000
  }'

# Update a plan
curl -X PUT http://localhost:3000/api/plans/plan_1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'

# Create invoice
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant_123",
    "items": [{
      "description": "Service charge",
      "unit_price": 5000000
    }]
  }'

# Mark as paid
curl -X POST http://localhost:3000/api/invoices/inv_1 \
  -H "Content-Type: application/json" \
  -d '{"wompi_transaction_id": "txn_123"}'
```
