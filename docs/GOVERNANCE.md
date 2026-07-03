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
- Governance of shared service URLs and service keys

## Services Own

| Service | Owns |
|---|---|
| auth | Central identity, sessions, SSO host, user membership by app and tenant |
| audit | Cross-app audit events, query API, retention/purge behavior |
| notifications | In-app notification inbox, unread counts, read state, retention/purge behavior |
| comms | Unified transactional email/push dispatch, outbox, idempotency, delivery status |

## Products Own

| Product | Owns |
|---|---|
| PEC | Commercial execution, leads, pipeline, quotes, sales rooms, imports |
| Incentivos | Programs, participants, point transactions, challenges, rewards, redemptions, rankings |
| Turnflow | Queues, appointments, customers, establishments, local operations, vertical workflows |
| ClubPass | External memberships, loyalty programs, benefits, redemptions, wallet passes |

## Runtime Rule

Products must not call Platform on every hot request. Products read local cache and sync via webhook plus cron.

Products may call Auth, Audit, Notifications, and Comms at workflow boundaries where the service is the system of record for that capability.

## Data Boundary Rule

Each base service must use its own database URL:

- Platform/Admin: `PLATFORM_DATABASE_URL`
- Auth: `AUTH_DATABASE_URL`
- Audit: `AUDIT_DATABASE_URL`
- Notifications: `NOTIFICATIONS_DATABASE_URL`
- Comms: `COMMS_DATABASE_URL`

Services must not fall back to a shared `DATABASE_URL` in production.

## Legacy Rule

Legacy repos can be used as functional reference or migration source. They must not receive new ecosystem architecture.
