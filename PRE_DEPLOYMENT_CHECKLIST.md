# Pre-Deployment Checklist

**Environment:** Production  
**Date:** $(date)  
**Deployed By:** [Your Name]  
**Status:** [ ] Ready to Deploy  

---

## Prerequisites

### Infrastructure
- [ ] Production database running (Neon/PostgreSQL)
- [ ] Database URL accessible (test: `psql $DATABASE_URL -c "SELECT 1"`)
- [ ] Backup system configured
- [ ] Monitoring/alerting setup (Vercel, DataDog, etc)
- [ ] SSL certificates valid (check: `curl -I https://platform.example.com`)

### Credentials & Secrets
- [ ] PLATFORM_DATABASE_URL set
- [ ] BETTER_AUTH_SECRET set
- [ ] PLATFORM_API_KEY generated and documented
- [ ] PLATFORM_WEBHOOK_SECRET matches Turnflow
- [ ] CRON_SECRET generated and stored securely
- [ ] WOMPI_PUBLIC_KEY available
- [ ] WOMPI_PRIVATE_KEY stored securely (not in git)
- [ ] WOMPI_WEBHOOK_SECRET generated

### Code Quality
- [ ] All tests passing locally: `pnpm test`
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Build succeeds: `pnpm build`
- [ ] No console errors/warnings in build output
- [ ] Git history is clean: `git log --oneline -10`
- [ ] Main branch is current: `git status` shows "on branch main" and "nothing to commit"

### Documentation
- [ ] DEPLOYMENT_GUIDE.md reviewed
- [ ] PHASE_4_WOMPI_INVOICING.md reviewed
- [ ] API_REFERENCE.md current
- [ ] Environment variables documented in .env.example

---

## Database

### Migration Verification
- [ ] Backup created: `pg_dump $DATABASE_URL > backup_TIMESTAMP.sql`
- [ ] Migration files present:
  - [ ] `drizzle/0000_platform_init.sql`
  - [ ] `drizzle/0001_billing.sql`
  - [ ] `drizzle/0002_turnflow_plans.sql`
  - [ ] `drizzle/0003_api_keys_audit.sql`
  - [ ] `drizzle/0004_wompi_integration.sql`

### Table Verification
- [ ] All platform tables exist:
  ```bash
  psql $DATABASE_URL -c "\dt platform_*"
  psql $DATABASE_URL -c "\dt api_keys webhook_deliveries audit_logs"
  psql $DATABASE_URL -c "\dt billing_cycles wompi_transactions payment_methods failed_payments"
  ```
- [ ] All tables have correct columns:
  ```bash
  psql $DATABASE_URL -c "\d billing_cycles"
  psql $DATABASE_URL -c "\d wompi_transactions"
  psql $DATABASE_URL -c "\d api_keys"
  ```
- [ ] Indexes created:
  ```bash
  psql $DATABASE_URL -c "\di" | grep -E "api_key|webhook|audit|billing|wompi"
  ```

### Data Verification
- [ ] Sample data exists:
  ```bash
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM platform_apps;"
  # Should return: 7 (pec, turnflow, clubpass, incentivos, customer, help, facturacion)
  
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM app_plans WHERE app_id='turnflow';"
  # Should return: 3 (basic, pro, plus)
  
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM platform_modules WHERE app_id='turnflow';"
  # Should return: 6 (clientes, citas, pagos, qr_checkin, reportes, offline)
  ```

---

## Configuration

### Environment Variables in Vercel/Production
- [ ] `PLATFORM_DATABASE_URL` set
- [ ] `BETTER_AUTH_SECRET` set
- [ ] `BETTER_AUTH_URL` correct
- [ ] `PLATFORM_API_KEY` set (different from staging)
- [ ] `PLATFORM_WEBHOOK_SECRET` set and matches Turnflow
- [ ] `CRON_SECRET` set and strong
- [ ] `TURNFLOW_WEBHOOK_URL` set (production Turnflow URL)
- [ ] `WOMPI_API_URL` set to production
- [ ] `WOMPI_PUBLIC_KEY` set
- [ ] `WOMPI_PRIVATE_KEY` set (NOT in .env.example, secret only)
- [ ] `WOMPI_WEBHOOK_SECRET` set

### Vercel Configuration
- [ ] `vercel.json` has correct cron jobs:
  ```json
  {
    "crons": [
      { "path": "/api/cron/sync-licenses", "schedule": "0 3 * * *" },
      { "path": "/api/cron/generate-invoices", "schedule": "0 2 * * *" },
      { "path": "/api/cron/process-payments", "schedule": "30 2 * * *" },
      { "path": "/api/cron/webhook-retry", "schedule": "*/5 * * * *" }
    ]
  }
  ```
- [ ] Custom domains configured (if needed)
- [ ] Git integration working (auto-deploy on main)

### Turnflow Configuration (must update after deploy)
- [ ] Turnflow has new `PLATFORM_API_KEY`
- [ ] Turnflow has matching `PLATFORM_WEBHOOK_SECRET`
- [ ] Turnflow has correct `PLATFORM_URL`
- [ ] Turnflow `CRON_SECRET` matches platform

---

## API Endpoints

### Health Checks
- [ ] Root endpoint: `GET https://platform.example.com/` returns 200
- [ ] Plans endpoint: `GET https://platform.example.com/api/plans` returns 200
- [ ] Can create API key (manual test with curl if needed)

### Critical Paths
- [ ] Marketplace endpoint works:
  ```bash
  curl https://platform.example.com/api/marketplace/test_tenant_id
  # Should return 200 with apps/modules list
  ```
- [ ] Webhook endpoint accessible:
  ```bash
  curl -X POST https://platform.example.com/api/webhooks/wompi -d '{}' -H "Content-Type: application/json"
  # Should return 400 (missing signature), not 404
  ```
- [ ] Cron endpoints protected:
  ```bash
  curl https://platform.example.com/api/cron/webhook-retry
  # Should return 401 (missing CRON_SECRET)
  ```

---

## Monitoring & Alerts

### Logging
- [ ] Error logging configured in Vercel
- [ ] Vercel logs dashboard accessible
- [ ] Log level set appropriately (not too verbose)

### Alerting
- [ ] Slack/Email alerts configured for:
  - [ ] 5xx errors
  - [ ] Cron job failures
  - [ ] Webhook delivery failures (>10% rate)
  - [ ] Database connection issues
  - [ ] Wompi payment failures

### Dashboards
- [ ] Create/update dashboards for:
  - [ ] API response times
  - [ ] Error rates
  - [ ] Webhook delivery status
  - [ ] Payment success rate
  - [ ] Database query performance

---

## Communication

### Internal
- [ ] #eng-platform Slack notified
- [ ] Team aware of deployment window
- [ ] Rollback plan documented and shared
- [ ] On-call person assigned for 24h after deploy

### External
- [ ] Status page updated (if applicable)
- [ ] Customers notified of any breaking changes (there are none)
- [ ] Documentation links shared

---

## Deployment Execution

### Pre-Deployment (30 min before)
- [ ] All PRs merged to main
- [ ] Main branch deployed to staging first
- [ ] Staging tests pass
- [ ] Database backup completed
- [ ] Team on standby

### Deployment (T-0)
- [ ] Run deploy script:
  ```bash
  cd /Users/german/hermes/lynkko-platform
  bash scripts/deploy.sh production
  ```
- [ ] Monitor deploy progress (watch Vercel dashboard)
- [ ] Verify smoke tests pass (curl checks)

### Post-Deployment (1 hour after)
- [ ] All endpoints responding: `curl https://platform.example.com/api/plans`
- [ ] No critical errors in logs
- [ ] Webhook retry cron working: `curl -H "Authorization: Bearer $CRON_SECRET" https://platform.example.com/api/cron/webhook-retry`
- [ ] Wompi webhook accessible: `curl -X POST https://platform.example.com/api/webhooks/wompi -d '{}' -H "Content-Type: application/json"`
- [ ] Create test API key and verify it works
- [ ] Check database connection pool
- [ ] Verify Turnflow can call platform APIs
- [ ] Test webhook delivery to Turnflow

### Validation (4 hours after)
- [ ] No errors in logs for 4 hours
- [ ] API response times normal (<200ms)
- [ ] Payment processing working (if applicable)
- [ ] Webhook deliveries flowing
- [ ] Audit logs being written

---

## Rollback Plan

If issues occur:

**Option 1: Rollback code only**
```bash
git revert HEAD
git push origin main
# Vercel will auto-deploy the revert
```

**Option 2: Rollback database**
```bash
psql $DATABASE_URL < backup_TIMESTAMP.sql
# Then redeploy code
```

**Option 3: Quick Fix**
```bash
# Fix the issue in code
git add .
git commit -m "fix: production issue"
git push origin main
# Vercel redeploys automatically
```

---

## Post-Deployment Sign-Off

| Role | Name | Signature | Time |
|------|------|-----------|------|
| DevOps | | | |
| QA | | | |
| Product | | | |

---

## Notes

Use this space to document any issues encountered or notes about the deployment:

```
[Deployment notes here]
```

---

**Deployment Date:** [DATE]  
**Completion Time:** [TIME]  
**Duration:** [DURATION]  
**Status:** ✅ Successful / ❌ Rollback  

**If rollback: Reason:**
```
[Rollback reason]
```
