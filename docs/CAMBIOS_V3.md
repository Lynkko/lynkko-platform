# lynkko-platform — Cambios para la arquitectura de servicios (V3)

> Spec de trabajo para el equipo de `lynkko-platform`. Deriva de las decisiones
> registradas en el documento canónico `Documentacion Lynkko/ARCHITECTURE_V3.md` §16–17.
> Todos los cambios son **aditivos**: no requieren reescribir las apps existentes.

---

## Contexto en una frase

`platform` deja de ser solo un schema Drizzle + SDK con acceso directo a DB, y pasa a
ser el **plano de control con API HTTP**, **host de identidad central** y **sistema de
revenue** del ecosistema. Los servicios satélite (comms, notifications, audit) se
construyen aparte; platform los **orquesta**.

Qué **NO** cambia:
- El patrón de integración distribuida de la §15 (webhook push + cron pull + caché
  local). Es el template correcto.
- `platform` sigue siendo la fuente de verdad de tenants, suscripciones, licencias,
  apps, módulos y revenue.

---

## 1. API HTTP versionada + SDK en modo fetch — **prioridad alta, bajo costo**

**Problema:** las apps conectan directo a la DB de platform vía `PLATFORM_DATABASE_URL`.
Renombrar una columna obliga a rebuild del paquete + redeploy de todas las apps.

**Cambio:**
- Exponer rutas HTTP versionadas (`/api/v1/...`) que cubran las operaciones del
  `PlatformClient`:
  - `GET /api/v1/tenants/:id`
  - `GET /api/v1/tenants/:id/subscription?app=:appId`
  - `GET /api/v1/tenants/:id/invoices`
  - `GET /api/v1/tenants/:id/usage`
  - (las que hoy expone el SDK)
- Auth por `PLATFORM_API_KEY` (el concepto ya existe en la doc de integración).
- `@lynkko/platform` gana un **modo HTTP**: apps nuevas usan fetch; las existentes
  migran gradualmente. Las apps solo necesitarían `PLATFORM_API_URL` + `PLATFORM_API_KEY`.

**Criterio de aceptación:** una app puede leer su suscripción sin tener
`PLATFORM_DATABASE_URL`.

**Toca apps existentes:** No.

---

## 2. Identidad central — host de Better Auth — **prioridad alta**

**Objetivo de negocio:** un cliente, un login, todas las apps. Nadie recuerda 8 usuarios.

**Cambio:**
- Hospedar la instancia central de Better Auth en platform (o servicio `lynkko-auth`
  dedicado si se decide aislar).
- **Store de identidad único.** Las apps validan el token localmente (JWT verificado
  sin llamada de red por request).
- **Separar authn de authz:** identidad global central; `role`/`tenantId`/membresías
  locales en cada app.
- **Modelo de membresías:** `user_id (global) → [{ app, tenantId, role }]`.
- **Decidir topología de dominio ANTES de implementar:** subdominios `*.lynkko.co`
  → cookie con scope `.lynkko.co` y SSO casi gratis. Dominios distintos → flujo de
  redención de token (más trabajo). **Recomendación: forzar subdominios.**
- Endpoints: login/registro/social central + emisión y revocación de tokens.

**Criterio de aceptación:** un usuario logueado en `turnflow.lynkko.co` entra a
`pec.lynkko.co` sin volver a autenticarse.

**Toca apps existentes:** Sí — migración de auth, gradual.

---

## 3. Módulo de revenue/billing — **prioridad media**

El cobro por licenciamiento y la gestión de revenue **se quedan en platform** (no es
una app aparte). Ya existen `plans`, `subscriptions`, `invoices`, `invoice_items`.

**Cambio:**
- Modelo de datos que permita facturación **per-app** y **opcionalmente** consolidada.
  No hacer la consolidación el default (per-app pricing, moneda, tratamiento fiscal y
  la pregunta del pagador legal lo complican).
- `wompi` se absorbe aquí como método de pago del flujo de revenue.
- Gancho futuro: cuando exista `lynkko-facturación` (producto DIAN, **diferido**),
  platform **consume su API** para materializar la factura legal — dogfooding del
  producto. Mientras tanto las facturas internas siguen como están.

**Toca apps existentes:** No.

---

## 4. Catálogo de servicios + webhooks salientes a servicios — **prioridad media**

Para orquestar comms / notifications / audit:

**Cambio:**
- **Catálogo de servicios** junto al catálogo de apps: URL base + API key por servicio.
- Reutilizar el patrón de webhooks salientes (§15) para notificar a los servicios.
  Ej.: al expirar una suscripción, avisar a `comms` para disparar email de dunning.

**Toca apps existentes:** No.

---

## 5. Endpoints que reemplazan schema embebido (notif/audit) — **prioridad media**

A medida que `notifications` y `audit` se vuelven servicios:

**Cambio:**
- Sus tablas salen de las DBs de las apps.
- `platform-admin` consume el servicio de `audit` para mostrar actividad
  cross-app/cross-tenant de un tenant — capacidad nueva, hoy imposible sin acceso a
  múltiples DBs.

**Toca apps existentes:** Sí — vaciar tabla local, gradual.

---

## Tabla resumen

| # | Cambio | Prioridad | Toca apps existentes |
|---|--------|-----------|----------------------|
| 1 | API HTTP versionada + SDK modo fetch | Alta | No (aditivo) |
| 2 | Host de identidad central (Better Auth) + membresías | Alta | Sí (gradual) |
| 3 | Módulo de revenue/billing consolidado | Media | No |
| 4 | Catálogo de servicios + webhooks a servicios | Media | No |
| 5 | Endpoints que reemplazan schema embebido (notif/audit) | Media | Sí (gradual) |

---

## Orden sugerido de ejecución

1. **(1) API HTTP + SDK modo fetch** — desacopla a las apps de la DB de platform.
   Bajo costo, alto valor, no toca a nadie. Hacer primero.
2. **(4) Catálogo de servicios** — prerrequisito barato para orquestar lo demás.
3. **Construir `lynkko-notifications` + `lynkko-audit`** (fuera de platform) y luego
   **(5)** conectarlos.
4. **(3) Revenue/billing** — cuando el patrón de servicios esté maduro.
5. **(2) Identidad central** — el de mayor impacto en apps; hacerlo con la decisión de
   subdominios ya tomada.

`lynkko-facturación` (producto DIAN) queda **diferido** — otras prioridades primero.

---

*Deriva de ARCHITECTURE_V3.md §16–17 · junio 2026*
