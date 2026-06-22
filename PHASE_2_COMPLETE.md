# ✅ Phase 2: Complete — Plans, Billing & Subscriptions

**Date:** June 21, 2026  
**Status:** Ready for Testing  
**Impact:** Full subscription and billing lifecycle management from Superadmin dashboard

---

## What Was Built

### 1. Plan Management (CRUD)

**GET `/api/plans`** — List all plans
- Filter by app_id
- Order by sort_order

**POST `/api/plans`** — Create new plan
- Validation: slug must be unique per app
- All fields configurable (price, features, seats, etc)

**PUT `/api/plans/{planId}`** — Update plan
- Can edit name, price, features, status
- Can't edit app_id (plan is tied to app)

**DELETE `/api/plans/{planId}`** — Delete plan
- Hard delete if no subscriptions
- Soft delete (mark inactive) if subscriptions exist
- Maintains data integrity

### 2. Subscription Lifecycle

**POST `/api/subscriptions/{subscriptionId}/update`** — Update subscription
- Change plan (upgrade/downgrade)
- Change seats
- Sends `plan_changed` or `subscription_updated` webhook

**POST `/api/subscriptions/{subscriptionId}/cancel`** — Cancel subscription
- `immediate: true` — Cancel now
- `immediate: false` — Cancel at end of billing period
- Sends `subscription_canceled` webhook with context

### 3. Invoice Management

**POST `/api/invoices`** — Create invoice
- Multiple line items per invoice
- Auto-generated invoice numbers (INV-YYYYMMDD-XXXX)
- Link to subscriptions or apps
- Tax calculation support

**GET `/api/invoices`** — List invoices
- Filter by tenant_id
- Filter by status (draft, open, paid, void)
- Pagination support

**GET `/api/invoices/{invoiceId}`** — Get invoice with items

**PUT `/api/invoices/{invoiceId}`** — Update invoice
- Change status
- Change due date
- Add notes

**POST `/api/invoices/{invoiceId}`** — Mark as paid
- Track Wompi transaction ID
- Store payment method details
- Update paidAt timestamp

### 4. Webhook Events (New)

```
plan_changed              → subscription plan upgraded/downgraded
subscription_updated      → seats or other details changed
subscription_canceled     → subscription terminated
```

All include full context (plan info, modules, period dates)

### 5. Server Actions

Dashboard forms now use:
```typescript
updatePlanAction()
deletePlanAction()
updateSubscriptionAction()
cancelSubscriptionAction()
createInvoiceAction()
updateInvoiceAction()
markInvoicePaidAction()
```

### 6. Documentation

- **BILLING_API.md** — Complete API reference with examples
- Curl examples for testing
- Error codes and responses

---

## File Structure

```
/apps/admin/src/
├── app/
│   ├── api/
│   │   ├── plans/route.ts (GET, POST)
│   │   ├── plans/[planId]/route.ts (GET, PUT, DELETE)
│   │   ├── subscriptions/[subscriptionId]/
│   │   │   ├── update/route.ts (PUT)
│   │   │   └── cancel/route.ts (POST)
│   │   └── invoices/
│   │       ├── route.ts (GET, POST)
│   │       └── [invoiceId]/route.ts (GET, PUT, POST)
│   └── dashboard/
│       ├── plans/actions.ts (create, update, delete)
│       ├── subscriptions/actions.ts (update, cancel)
│       └── billing/actions.ts (invoice operations)
└── lib/
    └── webhooks.ts (updated with new events)
```

---

## Complete Flow Examples

### Example 1: Plan Upgrade

```
1. Superadmin visits tenant's subscriptions page
2. Clicks "Change Plan" on turnflow subscription
3. Selects new plan (Pro → Enterprise)
4. Dashboard calls: updateSubscriptionAction(subId, planId)
5. Server action calls: PUT /api/subscriptions/{id}/update
6. Platform updates database
7. Platform sends webhook: plan_changed
8. Turnflow receives webhook:
   - Updates active_modules (enterprise has more features)
   - Updates period_end if pricing model changed
   - Returns 200 OK
9. UI updates, user sees new plan active
```

### Example 2: Create Invoice for Multiple Tenants

```
1. Superadmin goes to Billing dashboard
2. Clicks "Generate Invoices"
3. For each tenant:
   - Gets subscriptions
   - For each subscription:
     - Creates invoice item with subscription details
     - Includes monthly price
   - Calls createInvoiceAction(tenantId, items)
4. Platform creates invoice (INV-20260621-ABC1)
5. Stores line items linking to subscriptions
6. Invoice status: "open"
7. Superadmin can mark as paid when Wompi confirms
```

### Example 3: Cancel Subscription

```
1. Superadmin finds tenant, clicks "Cancel Subscription"
2. Prompted: "Cancel immediately or at end of period?"
3. Calls: cancelSubscriptionAction(subId, reason, immediate=true)
4. Platform:
   - Sets status: "canceled"
   - Sets canceledAt: now()
   - Sends webhook: subscription_canceled
5. Turnflow webhook handler:
   - Updates brand.licenseStatus: "expired"
   - Logs event to license_events
   - Starts showing access denied page
6. Response: success, subscription_id, canceled_at
```

---

## Testing Checklist

### Prerequisites
- [ ] Platform migrations applied
- [ ] Environment TURNFLOW_WEBHOOK_URL set (or default)
- [ ] PLATFORM_WEBHOOK_SECRET matches Turnflow

### Manual Testing

**1. Test Plan CRUD**
```bash
# Create plan
curl -X POST http://localhost:3000/api/plans \
  -H "Content-Type: application/json" \
  -d '{"app_id":"turnflow","slug":"test","name":"Test","monthly_price":5000000}'

# Get plans
curl http://localhost:3000/api/plans?app_id=turnflow

# Update plan
curl -X PUT http://localhost:3000/api/plans/plan_id \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# Delete plan (should soft-delete if subscriptions exist)
curl -X DELETE http://localhost:3000/api/plans/plan_id
```

**2. Test Subscription Updates**
```bash
# Update subscription
curl -X PUT http://localhost:3000/api/subscriptions/sub_id/update \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"plan_pro","seats":10}'

# Verify webhook sent to Turnflow
# Check Turnflow logs: "webhook received: plan_changed"
```

**3. Test Cancellation**
```bash
# Cancel subscription
curl -X POST http://localhost:3000/api/subscriptions/sub_id/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason":"Customer requested","immediate":true}'

# Verify webhook sent
# Check Turnflow: middleware should now show access denied
```

**4. Test Invoicing**
```bash
# Create invoice
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id":"tenant_123",
    "items":[{"description":"Monthly","unit_price":5000000}],
    "tax":500000
  }'

# List invoices
curl 'http://localhost:3000/api/invoices?tenant_id=tenant_123&status=open'

# Mark paid
curl -X POST http://localhost:3000/api/invoices/inv_id \
  -H "Content-Type: application/json" \
  -d '{"wompi_transaction_id":"txn_123"}'
```

**5. End-to-End**
- Create tenant
- Create subscription
- Verify webhook received
- Change plan via API
- Verify plan_changed webhook
- Create invoice
- Mark invoice paid
- Cancel subscription
- Verify access denied

---

## Database Schema Alignment

### Existing Tables Used

**app_plans** — Plan CRUD works directly on this table
- slug uniqueness enforced per (app_id, slug)
- isActive for soft deletes

**subscriptions** — Update/Cancel operations
- status field tracks: trialing, active, past_due, canceled
- currentPeriodEnd for billing cycles
- cancelAtPeriodEnd for delayed cancellation

**invoices** — Complete invoice lifecycle
- Auto-increment number (INV-...)
- status: draft, open, paid, void
- Wompi integration via wompiTransactionId

**invoice_items** — Line items
- Links to app_id and subscription_id
- Tracks unitPrice and quantity
- Calculated amount field

---

## Webhook Timing

Webhooks are sent **asynchronously** (fire-and-forget):
- Request doesn't wait for webhook delivery
- Webhook sent in background
- Errors logged but don't fail the API call
- Future: Add retry logic and delivery status tracking

---

## Limitations & Future Work

### Known Limitations
1. **No audit table** — Changes tracked via webhooks but not persisted
2. **No retry logic** — Webhook failures are logged but not retried
3. **No delivery status** — Can't see if webhook was received
4. **Manual invoice creation** — No auto-invoicing from subscriptions
5. **No payment processing** — Just tracking, not charging (Wompi integration manual)

### Phase 3 (Future)
- [ ] Auto-generate invoices on billing date
- [ ] Automatic Wompi payment processing
- [ ] Invoice history and reports
- [ ] Webhook retry queue
- [ ] Webhook delivery status tracking
- [ ] Audit trail table
- [ ] Revenue reporting dashboard
- [ ] Tax calculation per region

---

## Integration Points

### Turnflow Integration
- Receives `plan_changed` webhook → updates active_modules
- Receives `subscription_canceled` webhook → sets licenseStatus to expired
- Calls `GET /api/marketplace` → sees modules no longer available

### Superadmin Integration
- Dashboard shows plan management UI
- Can edit/delete plans
- Can upgrade/downgrade subscriptions
- Can generate invoices
- Can track payment status

---

## API Response Patterns

### Success
```json
{
  "status": "created|updated|deleted|paid|canceled",
  "plan|subscription|invoice": { ... },
  "webhook_sent": true
}
```

### Error
```json
{
  "error": "Human-readable message",
  "status": 400
}
```

---

## Performance Notes

- Plan list query: Fast (indexed by app_id)
- Invoice list: Can filter by status and tenant
- Subscription update: Single query + webhook async
- Invoice creation: Creates parent + multiple items in transaction

---

## Security Considerations

- API endpoints should require authentication (currently rely on session)
- Webhooks are HMAC-signed (verified by receiver)
- Invoice data includes sensitive pricing (should restrict to admin)
- No API key auth yet (Phase 3)

---

## Deployment

All Phase 2 code is ready:
1. Apply migrations (no new tables, uses existing)
2. Set environment variables
3. Deploy code
4. Test endpoints via curl or dashboard

No database schema changes required—Drizzle schema already has all needed tables.

---

## Support

**Issues?**
1. Check webhook logs in Turnflow
2. Verify webhook signature validation
3. Test API endpoints directly with curl
4. Check database data (plans, subscriptions, invoices tables)
5. Review BILLING_API.md for endpoint details
