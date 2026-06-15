import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { and, eq, gte, lte, desc, type SQL } from 'drizzle-orm'

// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * Tabla de auditoría. Incluir en tu schema Drizzle:
 *
 * @example
 * // src/db/schema.ts
 * import { auditLogs } from '@lynkko/audit'
 * export { auditLogs }
 *
 * // drizzle.config.ts — asegúrate de incluir esta tabla en las migraciones
 */
export const auditLogs = pgTable('audit_logs', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:   text('tenant_id').notNull(),
  userId:     text('user_id'),
  /** Acción realizada. Ej: 'lead.created', 'invoice.sent', 'user.login' */
  action:     text('action').notNull(),
  /** Recurso afectado. Ej: 'lead', 'invoice', 'user', 'subscription' */
  resource:   text('resource').notNull(),
  resourceId: text('resource_id'),
  /** Datos adicionales: payload antes/después, error, contexto. */
  meta:       jsonb('meta').$type<Record<string, unknown>>(),
  ip:         text('ip'),
  userAgent:  text('user_agent'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('audit_tenant_idx').on(t.tenantId),
  index('audit_user_idx').on(t.userId),
  index('audit_action_idx').on(t.action),
  index('audit_resource_idx').on(t.resource, t.resourceId),
  index('audit_created_idx').on(t.createdAt),
])

export type AuditLog       = typeof auditLogs.$inferSelect
export type AuditLogInsert = typeof auditLogs.$inferInsert

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuditEntry {
  tenantId:    string
  userId?:     string
  action:      string
  resource:    string
  resourceId?: string
  meta?:       Record<string, unknown>
  ip?:         string
  userAgent?:  string
}

export interface AuditQuery {
  tenantId:    string
  userId?:     string
  action?:     string
  resource?:   string
  resourceId?: string
  /** ISO 8601. Ej: '2026-01-01T00:00:00Z' */
  from?:       string | Date
  /** ISO 8601 */
  to?:         string | Date
  limit?:      number
  offset?:     number
}

export interface AuditLogger {
  /**
   * Registra una entrada de auditoría.
   *
   * @example
   * await audit.log({
   *   tenantId: ctx.tenantId,
   *   userId:   ctx.userId,
   *   action:   'lead.stage_changed',
   *   resource: 'lead',
   *   resourceId: lead.id,
   *   meta: { from: 'nuevo', to: 'calificado' },
   * })
   */
  log(entry: AuditEntry): Promise<AuditLog>

  /**
   * Consulta entradas de auditoría con filtros.
   *
   * @example
   * const logs = await audit.query({
   *   tenantId: ctx.tenantId,
   *   resource: 'invoice',
   *   from: startOfMonth,
   *   limit: 50,
   * })
   */
  query(filters: AuditQuery): Promise<AuditLog[]>

  /**
   * Elimina entradas más antiguas que la fecha indicada.
   * Útil para políticas de retención de datos.
   *
   * @example
   * const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
   * const deleted = await audit.purge(ninetyDaysAgo)
   */
  purge(olderThan: Date): Promise<number>
}

// ─── Factory ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

/**
 * Crea un logger de auditoría vinculado a tu instancia de Drizzle.
 *
 * @example
 * // src/lib/audit.ts
 * import { createAuditLogger } from '@lynkko/audit'
 * import { db } from './db'
 *
 * export const audit = createAuditLogger(db)
 *
 * // En un Route Handler o Server Action:
 * await audit.log({
 *   tenantId: ctx.tenantId,
 *   userId:   session.user.id,
 *   action:   'invoice.created',
 *   resource: 'invoice',
 *   resourceId: invoice.id,
 * })
 */
export function createAuditLogger(db: AnyDb): AuditLogger {
  return {
    async log(entry) {
      const [row] = await db
        .insert(auditLogs)
        .values(entry)
        .returning()
      return row as AuditLog
    },

    async query(filters) {
      const conditions: SQL[] = [eq(auditLogs.tenantId, filters.tenantId)]

      if (filters.userId)     conditions.push(eq(auditLogs.userId,     filters.userId))
      if (filters.action)     conditions.push(eq(auditLogs.action,     filters.action))
      if (filters.resource)   conditions.push(eq(auditLogs.resource,   filters.resource))
      if (filters.resourceId) conditions.push(eq(auditLogs.resourceId, filters.resourceId))
      if (filters.from)       conditions.push(gte(auditLogs.createdAt, new Date(filters.from)))
      if (filters.to)         conditions.push(lte(auditLogs.createdAt, new Date(filters.to)))

      return db
        .select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(filters.limit  ?? 50)
        .offset(filters.offset ?? 0) as Promise<AuditLog[]>
    },

    async purge(olderThan) {
      const deleted = await db
        .delete(auditLogs)
        .where(lte(auditLogs.createdAt, olderThan))
        .returning({ id: auditLogs.id })
      return deleted.length
    },
  }
}

// ─── Acciones predefinidas ────────────────────────────────────────────────────

/**
 * Constantes de acciones comunes para evitar strings sueltos.
 *
 * @example
 * await audit.log({ action: AUDIT_ACTIONS.USER_LOGIN, ... })
 */
export const AUDIT_ACTIONS = {
  USER_LOGIN:              'user.login',
  USER_LOGOUT:             'user.logout',
  USER_CREATED:            'user.created',
  USER_UPDATED:            'user.updated',
  USER_DELETED:            'user.deleted',
  USER_PASSWORD_CHANGED:   'user.password_changed',

  LEAD_CREATED:            'lead.created',
  LEAD_UPDATED:            'lead.updated',
  LEAD_DELETED:            'lead.deleted',
  LEAD_STAGE_CHANGED:      'lead.stage_changed',
  LEAD_ASSIGNED:           'lead.assigned',

  INVOICE_CREATED:         'invoice.created',
  INVOICE_SENT:            'invoice.sent',
  INVOICE_PAID:            'invoice.paid',
  INVOICE_VOIDED:          'invoice.voided',

  SUBSCRIPTION_CREATED:    'subscription.created',
  SUBSCRIPTION_UPGRADED:   'subscription.upgraded',
  SUBSCRIPTION_CANCELLED:  'subscription.cancelled',

  API_KEY_CREATED:         'api_key.created',
  API_KEY_REVOKED:         'api_key.revoked',
  API_KEY_USED:            'api_key.used',

  WEBHOOK_SENT:            'webhook.sent',
  WEBHOOK_FAILED:          'webhook.failed',
} as const

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS]
