# Deployment Guide — Phases 1-3

**Target:** Production Deployment  
**Phases:** 0 (pre-existing) + 1 (Marketplace) + 2 (Billing) + 3 (Auth & Webhooks)  
**Breaking Changes:** None (fully backwards compatible)

---

## Pre-Deployment Checklist

### 1. Code Review ✅
- [x] All endpoints tested with curl examples
- [x] No breaking changes to existing APIs
- [x] Session authentication still works
- [x] Database migrations included
- [x] Environment variables documented

### 2. Database Migrations

**Run in order:**
```bash
# Phase 1-2: No new tables (uses existing schema)
# Run any pending migrations from earlier phases

# Phase 3: New tables for auth, webhooks, audit
psql $PLATFORM_DATABASE_URL < apps/admin/drizzle/0003_api_keys_audit.sql
```

**Verify migration:**
```bash
psql $PLATFORM_DATABASE_URL -c "\dt"
# Should show: api_keys, webhook_deliveries, audit_logs, rate_limit_records
```

### 3. Environment Variables

**Required (existing):**
```bash
PLATFORM_DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...
```

**Required (new for Phase 3):**
```bash
CRON_SECRET=generate_new_random_value  # For cron jobs
```

**Optional (for webhooks):**
```bash
TURNFLOW_WEBHOOK_URL=https://turnflow.lynkko.co/api/platform/webhook
PLATFORM_WEBHOOK_SECRET=wh_secret_xxx  # Must match Turnflow's
```

### 4. Cron Jobs Setup

**Vercel (recommended):**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-licenses",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/webhook-retry",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Or Docker/EC2:**
```bash
# Add to crontab:
0 3 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://platform.example.com/api/cron/sync-licenses
*/5 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://platform.example.com/api/cron/webhook-retry
```

---

## Deployment Steps

### Stage 1: Staging Environment

**1. Deploy code**
```bash
git checkout main
git pull origin main
pnpm install
pnpm build
```

**2. Run migrations**
```bash
psql $STAGING_PLATFORM_DATABASE_URL < apps/admin/drizzle/0003_api_keys_audit.sql
```

**3. Verify endpoints**
```bash
# Test each endpoint with curl (examples in documentation)
curl https://staging-platform.example.com/api/plans
curl https://staging-platform.example.com/api/marketplace/test_tenant
curl https://staging-platform.example.com/api/api-keys
```

**4. Test workflows**
- [ ] Create API key for test app
- [ ] Create plan
- [ ] Create subscription
- [ ] Verify webhook queued
- [ ] Run webhook retry cron manually
- [ ] Verify delivery status
- [ ] Check audit logs

**5. Load test (optional)**
```bash
# Simulate 100 concurrent requests
ab -n 100 -c 10 https://staging-platform.example.com/api/marketplace/test_tenant
```

### Stage 2: Production Deployment

**1. Backup production database**
```bash
pg_dump $PRODUCTION_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

**2. Deploy code**
```bash
git checkout main
git pull origin main
pnpm install
pnpm build
# Deploy to production (Vercel, Heroku, Docker, etc.)
```

**3. Run migrations**
```bash
psql $PRODUCTION_DATABASE_URL < apps/admin/drizzle/0003_api_keys_audit.sql
```

**4. Verify deployment**
```bash
# Health check
curl https://platform.example.com/api/plans

# Test webhook retry cron
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://platform.example.com/api/cron/webhook-retry
```

**5. Create initial API key**
```bash
curl -X POST https://platform.example.com/api/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Turnflow Production",
    "app_id": "turnflow",
    "permissions": ["read", "write"],
    "expires_in_days": 365
  }'
```

**6. Update Turnflow**
```bash
# Set in Turnflow production .env:
PLATFORM_URL=https://platform.example.com
PLATFORM_API_KEY=sk_turnflow_xxxxx... (from step 5)
PLATFORM_WEBHOOK_SECRET=wh_secret_xxx (must match platform)
```

**7. Verify end-to-end**
- [ ] Turnflow fetches subscription: GET /api/apps/turnflow/subscription
- [ ] Turnflow reports metrics: POST /api/apps/turnflow/status-report
- [ ] Platform receives webhook: check webhook_deliveries table
- [ ] Audit log recorded: check audit_logs table

---

## Rollback Plan

**If deployment fails:**

```bash
# 1. Revert code to previous commit
git revert HEAD
git push origin main

# 2. Restore database (if schema broke)
psql $PRODUCTION_DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# 3. Notify team
# - Check #eng-platform Slack channel
# - Alert ops if critical
```

**If migrations cause issues:**

```bash
# Rollback is complex since migrations are append-only
# Better approach: fix and redeploy with new migration
# See "Fixing Migration Failures" below
```

---

## Post-Deployment

### Monitoring

**Check logs for errors:**
```bash
# Vercel
vercel logs

# Docker/EC2
tail -f /var/log/app.log | grep -i error
```

**Monitor key metrics:**
- API response times: <200ms
- Webhook retry success rate: >95%
- Audit logs written: >0
- Database connections: stable

**Set up alerts:**
- 5xx errors: alert immediately
- Webhook failures: alert if >10% fail over 1 hour
- Database query time: alert if >1s average

### Validation

**Test in prod (read-only):**
```bash
# List plans
curl https://platform.example.com/api/plans

# List API keys (from superadmin)
curl https://platform.example.com/api/api-keys

# Check audit logs
curl 'https://platform.example.com/api/audit-logs?limit=10'

# View webhook delivery status
curl 'https://platform.example.com/api/webhooks/deliveries?limit=10'
```

### Documentation

- [ ] Update runbooks with new endpoints
- [ ] Add API key creation to onboarding
- [ ] Document webhook retry strategy
- [ ] Add audit logging to compliance checklist

---

## Fixing Migration Failures

If a migration fails (rare):

**Option 1: Partial rollback**
```sql
-- Only rollback the problematic table
DROP TABLE IF EXISTS webhook_deliveries CASCADE;
-- Then re-run full migration
```

**Option 2: Fix and redeploy**
```bash
# Fix the SQL migration file
# Create new migration: 0004_fix_migration.sql
# Redeploy with new migration
```

**Option 3: Manual recovery**
```sql
-- If critical, manually fix schema:
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS ...;
-- Document what happened
-- Create 0004_manual_fix.sql for future reference
```

---

## Performance Tuning (Post-Deployment)

### Index Analysis

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- Add missing indexes if needed
CREATE INDEX CONCURRENTLY ON webhook_deliveries(app_id, status);
```

### Query Optimization

```sql
-- Slow query log (if using Postgres 13+)
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```

### Connection Pooling

```
# In connection string:
postgresql://user:pass@host/db?sslmode=require&pool_size=20
```

---

## Version Management

**Track deployed versions:**

```bash
# Tag releases
git tag -a v3.0.0 -m "Phase 3 deployment"
git push origin v3.0.0

# View deployment history
git tag -l --format='%(refname:short): %(objectname:short) %(subject)'
```

---

## Team Communication

### Pre-Deployment

Post in #eng-platform:
```
🚀 Preparing Phase 3 deployment to staging

Changes:
- API key authentication
- Webhook retry queue
- Audit trail system
- 6 new endpoints, 4 new tables

ETA: 2h (staging only)
Migration size: ~200KB SQL
Zero breaking changes ✅

Questions? Ask in thread
```

### Deployment In Progress

```
🔄 Deploying Phase 3 to PRODUCTION

Status: Database migrations in progress
Time: 09:30 UTC
Contact: @eng-on-call if critical
```

### Post-Deployment

```
✅ Phase 3 deployed successfully

New features:
- API key auth (GET /api/api-keys)
- Webhook retry queue (GET /api/cron/webhook-retry)
- Audit trail (GET /api/audit-logs)
- Webhook delivery tracking

Runbook: https://wiki.company.com/platform/phase-3
Docs: https://github.com/Lynkko/lynkko-platform/blob/main/PHASE_3_AUTH_WEBHOOKS_AUDIT.md
```

---

## Support & Troubleshooting

### Common Issues

**"API key rejected"**
- Verify key not expired
- Check rate limit not hit (HTTP 429)
- Verify correct app_id

**"Webhook not retrying"**
- Check `webhook_deliveries` table
- Verify cron job running: `GET /api/cron/webhook-retry`
- Check CRON_SECRET set correctly

**"Migration failed"**
- Check disk space
- Verify PostgreSQL version compatibility
- Review migration SQL syntax

### Getting Help

1. Check logs: `vercel logs` or `docker logs`
2. Review documentation: PHASE_3_AUTH_WEBHOOKS_AUDIT.md
3. Query database: `psql $DATABASE_URL -c "SELECT * FROM audit_logs LIMIT 5;"`
4. Ask in #eng-platform Slack

---

## Success Criteria

✅ **Deployment successful when:**
- All migrations applied without errors
- All 25 endpoints responding (200 OK)
- Webhook retry cron running successfully
- Audit logs being written
- Session auth still working
- API key auth working with new keys
- Zero errors in application logs
- All tests passing

✅ **Ready for Phase 4 when:**
- Deployment stable for 24 hours
- All monitoring alerts configured
- Team comfortable with new features
- No blocking issues in #eng-platform

---

## Rollout Timeline

| Time | Action |
|------|--------|
| T-1h | Database backup |
| T-0h | Code deployment starts |
| T+15m | Migrations apply |
| T+30m | Smoke tests (curl checks) |
| T+45m | Create production API key |
| T+60m | Update Turnflow .env |
| T+90m | End-to-end validation |
| T+120m | ✅ Deployment complete |

**On-call window:** Next 24 hours after deployment

---

## Documentation Links

- **Overview:** [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **API Reference:** [API_REFERENCE.md](API_REFERENCE.md)
- **Phase 3 Details:** [PHASE_3_AUTH_WEBHOOKS_AUDIT.md](PHASE_3_AUTH_WEBHOOKS_AUDIT.md)
- **Billing APIs:** [BILLING_API.md](BILLING_API.md)
- **Marketplace:** [MARKETPLACE_API.md](MARKETPLACE_API.md)

---

**Deployment Approved By:** [To be filled]  
**Deployment Date:** [To be filled]  
**Deployed By:** [To be filled]  
**Status:** Ready for staging → production
