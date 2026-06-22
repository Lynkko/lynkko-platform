# Phase 4: Auto-Invoicing & Wompi Payment Integration

**Status:** ✅ Complete  
**Date:** June 22, 2026  
**APIs Added:** 4 new cron endpoints  
**Tables Added:** 4 new tables (billing cycles, payments, methods, retries)  
**Payment Gateway:** Wompi Integration

---

## What Was Built

### 1. Auto-Invoice Generation

**New Table: `billing_cycles`**
- Track subscription billing dates
- Schedule next invoice date
- Store invoice ID once generated
- Track payment status through lifecycle

**New Endpoint:**
- `GET /api/cron/generate-invoices` — Auto-generate invoices on billing dates
  - Runs: Daily at 2:00 AM UTC
  - Protected: CRON_SECRET
  - Auto-creates invoice based on subscription plan
  - Updates billing cycle with invoice ID

**Features:**
- Automatic invoice creation on billing cycle start
- Includes all subscription details (plan, dates, amounts)
- Adds standard tax (19% configurable)
- Sets 15-day payment terms
- Creates audit trail for compliance

### 2. Wompi Payment Processing

**Wompi Integration Library (`lib/wompi.ts`)**
- Process payments via Wompi API
- Tokenize payment methods (save cards)
- Verify webhook signatures
- Calculate payment amounts with fees
- Handle transaction status

**New Endpoint:**
- `GET /api/cron/process-payments` — Process pending payments with Wompi
  - Runs: Daily at 2:30 AM UTC (after invoices)
  - Protected: CRON_SECRET
  - Fetches default payment method for tenant
  - Processes payment with Wompi
  - Marks invoice as paid on success

**Features:**
- Automatic retry on payment failure
- Support for saved payment methods
- Automatic fee calculation
- Detailed error tracking
- Audit logging for compliance

### 3. Wompi Webhook Handler

**New Endpoint:**
- `POST /api/webhooks/wompi` — Handle Wompi payment confirmations
  - Validates HMAC-SHA256 signature
  - Updates transaction status
  - Marks invoice as paid
  - Cleans up failed payment queue
  - Sends audit logs

**Supported Wompi Events:**
- `transaction.updated` — Transaction status changed
- `transaction.confirmed` — Payment approved
- `transaction.declined` — Payment rejected

### 4. Payment Failure Recovery

**New Table: `failed_payments`**
- Queue for failed payment retries
- Track attempt count and max attempts
- Schedule retry dates with exponential backoff
- Track failure reasons
- Mark as resolved when paid or written off

**Retry Strategy:**
- 1st retry: 24 hours
- 2nd retry: 48 hours  
- 3rd retry: 72 hours
- 4th retry: 1 week
- 5th retry: Final attempt
- Then: Mark as failed, manual intervention needed

### 5. Payment Methods Storage

**New Table: `payment_methods`**
- Store tenant's saved payment methods
- Wompi tokenized payment tokens
- Card last 4 digits, brand, expiration
- Default payment method selection
- Active/inactive status

---

## Database Schema

### New Tables

**billing_cycles**
```sql
id: TEXT PRIMARY KEY
subscription_id: TEXT FOREIGN KEY
tenant_id: TEXT
app_id: TEXT
cycle_start: TIMESTAMPTZ (billing period start)
cycle_end: TIMESTAMPTZ (billing period end)
next_invoice_date: TIMESTAMPTZ (when to generate invoice)
invoice_id: TEXT FOREIGN KEY (once generated)
invoice_generated_at: TIMESTAMPTZ
payment_status: TEXT (pending, processing, completed, failed, overdue)
payment_attempts: INTEGER
max_payment_attempts: INTEGER (default 3)
last_payment_attempt_at: TIMESTAMPTZ
last_payment_error: TEXT
metadata: JSONB
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

**wompi_transactions**
```sql
id: TEXT PRIMARY KEY
invoice_id: TEXT FOREIGN KEY
subscription_id: TEXT FOREIGN KEY
tenant_id: TEXT
amount: INTEGER (in lowest currency unit)
currency: TEXT (COP, USD, etc)
reference: TEXT UNIQUE (Wompi reference)
status: TEXT (APPROVED, PENDING, DECLINED, ERROR)
payment_method: JSONB { type, brand, last_four }
wompi_response: JSONB (full API response)
error_message: TEXT
processed_at: TIMESTAMPTZ
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

**payment_methods**
```sql
id: TEXT PRIMARY KEY
tenant_id: TEXT
type: TEXT (card, bank_account, etc)
brand: TEXT (VISA, MASTERCARD, AMEX)
last_four: TEXT
token: TEXT UNIQUE (Wompi tokenized)
is_default: BOOLEAN
is_active: BOOLEAN
expires_at: TIMESTAMPTZ
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

**failed_payments**
```sql
id: TEXT PRIMARY KEY
invoice_id: TEXT FOREIGN KEY
billing_cycle_id: TEXT FOREIGN KEY
tenant_id: TEXT
amount: INTEGER
currency: TEXT
reason: TEXT (declined, network_error, expired_card)
attempt_count: INTEGER
max_attempts: INTEGER (default 5)
next_retry_at: TIMESTAMPTZ
last_retry_at: TIMESTAMPTZ
resolved_at: TIMESTAMPTZ (NULL until resolved)
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

---

## Cron Job Schedule

### Production Cron Setup (Vercel)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-licenses",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/generate-invoices",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/process-payments",
      "schedule": "30 2 * * *"
    },
    {
      "path": "/api/cron/webhook-retry",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Timeline (All UTC):**
```
2:00 AM  - sync-licenses (Turnflow fetches subscription)
2:00 AM  - generate-invoices (Create invoices for billing dates)
2:30 AM  - process-payments (Process invoices with Wompi)
5m loop  - webhook-retry (Process pending webhooks)
```

### Docker/EC2 Cron Setup

```bash
# Add to crontab (crontab -e):

# Turnflow license sync at 2am
0 2 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://platform.example.com/api/cron/sync-licenses

# Generate invoices at 2am  
0 2 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://platform.example.com/api/cron/generate-invoices

# Process payments at 2:30am
30 2 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://platform.example.com/api/cron/process-payments

# Retry webhooks every 5 minutes
*/5 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://platform.example.com/api/cron/webhook-retry
```

---

## Configuration

### Environment Variables

```bash
# ── Wompi Integration ──────────────────────────────────────────────────────────
WOMPI_API_URL=https://api.wompi.co
WOMPI_PUBLIC_KEY=pub_prod_xxx      # Use in frontend/client
WOMPI_PRIVATE_KEY=prv_prod_xxx     # KEEP SECRET, use in server
WOMPI_WEBHOOK_SECRET=wh_wompi_xxx  # For webhook signature validation

# ── Cron Jobs ─────────────────────────────────────────────────────────────────
CRON_SECRET=your_secure_random_secret
```

### Wompi Setup

1. Create Wompi account at https://dashboard.wompi.co
2. Get API keys from dashboard
3. Create webhook endpoint: `https://yourdomain.com/api/webhooks/wompi`
4. Set webhook events: `transaction.updated`, `transaction.confirmed`, `transaction.declined`
5. Get webhook secret from webhook configuration

---

## Invoice Generation Flow

```
Day 1 (Subscription starts)
├─ Create subscription
├─ Create billing_cycle (cycle_start, cycle_end, next_invoice_date)
└─ Payment status: "pending"

Day 15 (next_invoice_date)
├─ Cron: generate-invoices runs at 2:00 AM
├─ Queries: WHERE next_invoice_date <= NOW
├─ For each:
│  ├─ Create invoice (based on subscription plan)
│  ├─ Add line item (plan name, dates, amount)
│  ├─ Calculate tax (19% default)
│  ├─ Update billing_cycle.invoice_id
│  └─ Payment status: "processing"
└─ Audit log: invoice created

Day 15 (30 minutes later)
├─ Cron: process-payments runs at 2:30 AM
├─ Queries: invoices WHERE status='open' AND billing_cycle.payment_status='processing'
├─ For each:
│  ├─ Get tenant's default payment method
│  ├─ Call Wompi API to process payment
│  ├─ Store transaction (wompi_transactions table)
│  └─ If APPROVED:
│     ├─ Mark invoice.status='paid'
│     ├─ Update billing_cycle.payment_status='completed'
│     └─ Audit log: payment processed
├─ If DECLINED:
│  ├─ Insert into failed_payments queue
│  ├─ Schedule retry for tomorrow
│  └─ Set billing_cycle.last_payment_error
└─ End of automated flow

Day 16-30 (Retries)
├─ Webhook from Wompi arrives asynchronously
├─ Webhook handler processes transaction.confirmed
├─ Mark invoice paid if needed
└─ Clean up failed_payments queue
```

---

## Payment Processing Flow

```
invoice.status = "open"
     ↓
    └─→ process-payments cron
        ├─ Get payment method (must have is_default=true)
        ├─ Wompi API: /transactions POST
        ├─ If APPROVED:
        │  ├─ Create wompi_transaction (status=APPROVED)
        │  ├─ Update invoice.status='paid'
        │  ├─ Update billing_cycle.payment_status='completed'
        │  └─ Audit log: success
        └─ If DECLINED:
           ├─ Create wompi_transaction (status=DECLINED)
           ├─ Insert failed_payment (next_retry_at=tomorrow)
           ├─ Update billing_cycle.payment_status='failed'
           └─ Audit log: failure
            
            OR
        
        └─ Wompi webhook arrives (async)
           ├─ POST /api/webhooks/wompi
           ├─ Verify HMAC signature
           ├─ If transaction.confirmed:
           │  ├─ Update invoice.status='paid'
           │  ├─ Update billing_cycle.payment_status='completed'
           │  └─ Clear failed_payment
           └─ If transaction.declined:
              ├─ Update billing_cycle.last_payment_error
              └─ Create/update failed_payment
```

---

## Testing

### Unit Tests

```bash
# Test Wompi integration
npm test -- wompi.test.ts

# Test invoice generation
npm test -- generate-invoices.test.ts

# Test payment processing
npm test -- process-payments.test.ts
```

### Integration Tests

**Create test billing cycle:**
```bash
curl -X POST http://localhost:3000/api/billing-cycles \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subscription_id": "sub_123",
    "cycle_start": "2026-06-21T00:00:00Z",
    "cycle_end": "2026-07-21T00:00:00Z",
    "next_invoice_date": "2026-07-21T00:00:00Z"
  }'
```

**Manually trigger invoice generation:**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/generate-invoices
# Should return: { generated: 1, failed: 0, total: 1 }
```

**Manually trigger payment processing:**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/process-payments
# Should return: { processed: 1, succeeded: 1, failed: 0 }
```

**Simulate Wompi webhook:**
```bash
curl -X POST http://localhost:3000/api/webhooks/wompi \
  -H "x-wompi-signature: $(echo -n 'payload' | sha256sum | cut -d' ' -f1)" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transaction.confirmed",
    "data": {
      "id": "txn_123",
      "reference": "INV-20260621-ABC1",
      "status": "APPROVED",
      "amount_in_cents": 1000000
    }
  }'
```

---

## Failure Handling

### Payment Declined

**What happens:**
1. Wompi returns DECLINED
2. Transaction stored with error reason
3. Failed payment queued for retry
4. Billing cycle marked as "failed"
5. Audit log records reason

**Retry strategy:**
- Retry same payment method after 24 hours
- If still failing, try 4 more times (total 5 attempts)
- After 5 failures, mark as "write-off" (manual intervention)

### Network Error

**What happens:**
1. Wompi API unreachable
2. Payment queued as failed (network error)
3. Automatic retry every 24 hours

**Recovery:**
- Cron job automatically retries
- When Wompi recovers, payment processes
- Invoice marked paid automatically

### Webhook Failure

**What happens:**
1. Payment succeeds at Wompi
2. Webhook delivery fails
3. Manual retry via `/api/cron/webhook-retry`
4. Webhook retry exponential backoff

**Recovery:**
- Invoice may show as "open" but Wompi has it as approved
- Webhook retry processor will eventually deliver confirmation
- Or manual verification via Wompi dashboard

---

## Monitoring & Alerts

### Key Metrics

```sql
-- Failed payments this week
SELECT COUNT(*) FROM failed_payments 
WHERE created_at > NOW() - INTERVAL '7 days'
AND resolved_at IS NULL;

-- Invoice paid rate (last 30 days)
SELECT 
  (COUNT(*) FILTER (WHERE status='paid'))::float / COUNT(*) * 100 as paid_rate
FROM invoices 
WHERE created_at > NOW() - INTERVAL '30 days';

-- Average payment processing time
SELECT AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds
FROM wompi_transactions
WHERE processed_at IS NOT NULL;
```

### Alerts to Set

- Payment success rate < 90%
- Failed payments queue > 10
- Webhook delivery failure rate > 5%
- Cron job failure
- Database connection pool exhausted

---

## Wompi Webhook Signature Validation

**Wompi sends:**
```
X-Wompi-Signature: sha256_hash
```

**Validation (in code):**
```typescript
const crypto = require('crypto')
const signature = req.headers.get('x-wompi-signature')
const payload = await req.text()
const secret = process.env.WOMPI_WEBHOOK_SECRET

const hash = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex')

const isValid = hash === signature
```

---

## Files Added

```
New Cron Endpoints:
├── api/cron/generate-invoices/route.ts
├── api/cron/process-payments/route.ts
├── api/webhooks/wompi/route.ts

New Libraries:
├── lib/wompi.ts (Wompi API client)

Database:
├── drizzle/0004_wompi_integration.sql (4 new tables)

Documentation:
├── PHASE_4_WOMPI_INVOICING.md (this file)
```

---

## Next Steps (Phase 5+)

- [ ] Revenue analytics dashboard
- [ ] Subscription proration on plan changes
- [ ] Invoice PDF generation
- [ ] Payment method UI (save/update cards)
- [ ] Subscription pause/resume
- [ ] One-time charges
- [ ] Usage-based billing
- [ ] Refunds and credits
- [ ] Tax compliance per region
- [ ] Dunning emails for failed payments

---

## Summary

Phase 4 adds enterprise billing automation:

✅ **Auto-Invoicing:** Generate invoices on billing dates  
✅ **Wompi Integration:** Process payments automatically  
✅ **Payment Tracking:** Full transaction history  
✅ **Failure Recovery:** Automatic retry on payment decline  
✅ **Webhook Handling:** Async payment confirmations  
✅ **Compliance:** Full audit trail for all operations  

**Ready for:** Production billing operations, Wompi sandbox/production
