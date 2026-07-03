# Lynkko Platform Certification

This document defines when `lynkko-platform` is certified as the base for product migrations.

## Certified Scope

- Platform API v1 for license, subscription, tenant, invoices, and usage.
- Published HTTP SDK clients in `@lynkko/platform`, `@lynkko/audit`, `@lynkko/notifications`, and `@lynkko/comms`.
- Central Auth service for ecosystem identity, sessions, and app/tenant memberships.
- Operational Audit, Notifications, and Comms services with their own databases.
- Platform service registry entries for `auth`, `audit`, `notifications`, and `comms`.
- Product adoption kit for SDK use, signed webhooks, cron sync, local license cache, and service boundaries.

## Certification Stages

### Stage 1: Platform Live

Use this stage to prove the central admin/API is reachable and its v1 product contract works.

```bash
pnpm certification:env:platform
pnpm certification:smoke:platform
```

### Stage 2: Base Services Live

Use this stage to prove the base ecosystem services are deployed and callable through their service keys.

```bash
pnpm certification:env:services
pnpm certification:smoke:services
```

### Stage 3: Full Base Certification

Run this before declaring Platform ready for product migrations.

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
AUTH_URL=https://auth.lynkko.co
AUTH_SERVICE_API_KEY=
AUDIT_URL=https://audit.lynkko.co
AUDIT_API_KEY=
NOTIFICATIONS_URL=https://notifications.lynkko.co
NOTIFICATIONS_API_KEY=
COMMS_URL=https://comms.lynkko.co
COMMS_API_KEY=
CERTIFICATION_TENANT_ID=
CERTIFICATION_USER_ID=certification-user
COMMS_SMOKE_TO=
```

`COMMS_SMOKE_TO` is optional. If it is missing, the smoke test validates Comms health and outbox reads without sending a real email.

## Definition of Done

- `pnpm type-check` passes.
- `pnpm build` passes.
- `pnpm certification:exports` passes.
- Platform API v1 smoke test passes against a certification tenant.
- Audit smoke test can create and query an audit entry.
- Notifications smoke test can create, query, and count unread notifications.
- Auth smoke test can upsert and query a certification membership.
- Comms smoke test can read the outbox, and can send a test email when `COMMS_SMOKE_TO` is configured.
- `docs/GOVERNANCE.md` identifies the owner of each shared capability.
- `docs/ADOPTION_KIT.md` gives products a single integration path.
