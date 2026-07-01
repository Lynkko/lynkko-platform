import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { and, eq, desc, lte, isNull, count } from 'drizzle-orm'

// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * Tabla de notificaciones in-app. Incluir en tu schema Drizzle:
 *
 * @example
 * // src/db/schema.ts
 * import { notifications } from '@lynkko/notifications'
 * export { notifications }
 */
export const notifications = pgTable('notifications', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:  text('tenant_id').notNull(),
  userId:    text('user_id').notNull(),
  /** Título breve. Ej: 'Nueva factura disponible' */
  title:     text('title').notNull(),
  /** Cuerpo completo de la notificación. */
  body:      text('body').notNull(),
  /**
   * Tipo semántico para iconos/colores en el UI.
   * Ej: 'info' | 'success' | 'warning' | 'error' | 'lead' | 'invoice'
   */
  type:      text('type').default('info'),
  /** URL interna o externa al hacer click en la notificación. */
  link:      text('link'),
  /** Datos extra para el UI (imagen, avatar, entity_id…). */
  meta:      jsonb('meta').$type<Record<string, unknown>>(),
  /** null = no leída, timestamp = momento en que se leyó. */
  readAt:    timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('notif_tenant_user_idx').on(t.tenantId, t.userId),
  index('notif_read_idx').on(t.readAt),
  index('notif_created_idx').on(t.createdAt),
])

export type Notification       = typeof notifications.$inferSelect
export type NotificationInsert = typeof notifications.$inferInsert

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateNotificationInput {
  tenantId: string
  userId:   string
  title:    string
  body:     string
  type?:    string
  link?:    string
  meta?:    Record<string, unknown>
}

export interface GetNotificationsOptions {
  /** Solo no leídas. Default: false */
  unreadOnly?: boolean
  limit?:      number
  offset?:     number
}

export interface NotificationService {
  /**
   * Crea una notificación para un usuario.
   *
   * @example
   * await notif.create({
   *   tenantId: ctx.tenantId,
   *   userId:   lead.assignedTo,
   *   title:    'Nuevo prospecto asignado',
   *   body:     `${lead.name} fue asignado a ti`,
   *   type:     'lead',
   *   link:     `/leads/${lead.id}`,
   *   meta:     { leadId: lead.id, avatar: lead.avatarUrl },
   * })
   */
  create(input: CreateNotificationInput): Promise<Notification>

  /**
   * Marca una notificación como leída.
   *
   * @example
   * await notif.markRead(notificationId, ctx.userId)
   */
  markRead(id: string, userId: string): Promise<void>

  /**
   * Marca todas las notificaciones de un usuario como leídas.
   *
   * @example
   * await notif.markAllRead(ctx.userId, ctx.tenantId)
   */
  markAllRead(userId: string, tenantId: string): Promise<void>

  /**
   * Retorna las notificaciones de un usuario (por defecto las no leídas primero).
   *
   * @example
   * const items = await notif.get(ctx.userId, ctx.tenantId, { limit: 20 })
   * const unread = await notif.get(ctx.userId, ctx.tenantId, { unreadOnly: true })
   */
  get(userId: string, tenantId: string, options?: GetNotificationsOptions): Promise<Notification[]>

  /**
   * Retorna el conteo de notificaciones no leídas.
   * Usar para el badge de la campana.
   *
   * @example
   * const { count } = await notif.countUnread(ctx.userId, ctx.tenantId)
   */
  countUnread(userId: string, tenantId: string): Promise<number>

  /**
   * Elimina notificaciones leídas más antiguas que la fecha indicada.
   *
   * @example
   * const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
   * await notif.purge(thirtyDaysAgo)
   */
  purge(olderThan: Date): Promise<number>
}

// ─── Factory ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

/**
 * Crea un servicio de notificaciones in-app vinculado a tu instancia de Drizzle.
 *
 * @example
 * // src/lib/notifications.ts
 * import { createNotificationService } from '@lynkko/notifications'
 * import { db } from './db'
 *
 * export const notif = createNotificationService(db)
 *
 * // app/api/notifications/route.ts
 * export async function GET(req: Request) {
 *   const items = await notif.get(ctx.userId, ctx.tenantId, { limit: 20 })
 *   return ok(items)
 * }
 *
 * // app/api/notifications/[id]/read/route.ts
 * export async function POST(req: Request, { params }: { params: { id: string } }) {
 *   await notif.markRead(params.id, ctx.userId)
 *   return ok()
 * }
 */
export function createNotificationService(db: AnyDb): NotificationService {
  return {
    async create(input) {
      const [row] = await db
        .insert(notifications)
        .values(input)
        .returning()
      return row as Notification
    },

    async markRead(id, userId) {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(
          eq(notifications.id,     id),
          eq(notifications.userId, userId),
        ))
    },

    async markAllRead(userId, tenantId) {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(
          eq(notifications.userId,   userId),
          eq(notifications.tenantId, tenantId),
          isNull(notifications.readAt),
        ))
    },

    async get(userId, tenantId, options) {
      const conditions = [
        eq(notifications.userId,   userId),
        eq(notifications.tenantId, tenantId),
      ]
      if (options?.unreadOnly) conditions.push(isNull(notifications.readAt))

      return db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(options?.limit  ?? 20)
        .offset(options?.offset ?? 0) as Promise<Notification[]>
    },

    async countUnread(userId, tenantId) {
      const [row] = await db
        .select({ value: count() })
        .from(notifications)
        .where(and(
          eq(notifications.userId,   userId),
          eq(notifications.tenantId, tenantId),
          isNull(notifications.readAt),
        ))
      return row?.value ?? 0
    },

    async purge(olderThan) {
      const deleted = await db
        .delete(notifications)
        .where(lte(notifications.createdAt, olderThan))
        .returning({ id: notifications.id })
      return deleted.length
    },
  }
}

// ─── SSE helper ──────────────────────────────────────────────────────────────

/**
 * Crea un ReadableStream compatible con Server-Sent Events (SSE).
 * Cada vez que se llame `send(notification)` el cliente recibe el evento.
 *
 * @example
 * // app/api/notifications/stream/route.ts
 * import { createSseStream } from '@lynkko/notifications'
 *
 * export async function GET(req: Request) {
 *   const { stream, send, close } = createSseStream()
 *
 *   // Polling cada 5s — en producción reemplazar con pub/sub (Redis, Supabase Realtime…)
 *   const interval = setInterval(async () => {
 *     const items = await notif.get(ctx.userId, ctx.tenantId, { unreadOnly: true })
 *     if (items.length > 0) send({ type: 'notifications', data: items })
 *   }, 5000)
 *
 *   req.signal.addEventListener('abort', () => { clearInterval(interval); close() })
 *
 *   return new Response(stream, {
 *     headers: {
 *       'Content-Type':  'text/event-stream',
 *       'Cache-Control': 'no-cache',
 *       'Connection':    'keep-alive',
 *     },
 *   })
 * }
 */
export function createSseStream() {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl
      const enc = new TextEncoder()
      ctrl.enqueue(enc.encode(': connected\n\n'))
    },
    cancel() {
      controller = null
    },
  })

  const enc = new TextEncoder()

  return {
    stream,

    send(payload: { type: string; data: unknown }) {
      if (!controller) return
      const msg = `event: ${payload.type}\ndata: ${JSON.stringify(payload.data)}\n\n`
      controller.enqueue(enc.encode(msg))
    },

    close() {
      if (controller) {
        controller.close()
        controller = null
      }
    },
  }
}

// ─── Tipos predefinidos ───────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = {
  INFO:      'info',
  SUCCESS:   'success',
  WARNING:   'warning',
  ERROR:     'error',
  LEAD:      'lead',
  INVOICE:   'invoice',
  PAYMENT:   'payment',
  TASK:      'task',
  MENTION:   'mention',
  SYSTEM:    'system',
} as const

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES]

// ─── HTTP client (WS-2: consumir el servicio lynkko-notifications) ────────────
//
// Mismas firmas que NotificationService, pero contra el servicio HTTP en vez de
// una DB local. La app solo necesita NOTIFICATIONS_URL + NOTIFICATIONS_API_KEY.

export function createNotificationsHttpClient(
  baseUrl: string,
  apiKey: string,
): NotificationService {
  const root = baseUrl.replace(/\/$/, '')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function call(path: string, init?: RequestInit): Promise<any> {
    const res = await fetch(`${root}/api${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(`notifications API ${path} → ${res.status} ${await res.text()}`)
    return res.status === 204 ? null : res.json()
  }

  const qs = (params: Record<string, string | number | boolean | undefined>) =>
    '?' + Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&')

  return {
    async create(input) {
      return (await call('/notifications', { method: 'POST', body: JSON.stringify(input) })) as Notification
    },
    async markRead(id, userId) {
      await call(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', body: JSON.stringify({ userId }) })
    },
    async markAllRead(userId, tenantId) {
      await call('/notifications/read-all', { method: 'POST', body: JSON.stringify({ userId, tenantId }) })
    },
    async get(userId, tenantId, options) {
      const r = await call('/notifications' + qs({ userId, tenantId, ...options }))
      return (r?.items ?? []) as Notification[]
    },
    async countUnread(userId, tenantId) {
      const r = await call('/notifications/unread-count' + qs({ userId, tenantId }))
      return (r?.count ?? 0) as number
    },
    async purge(olderThan) {
      const r = await call('/notifications/purge', { method: 'POST', body: JSON.stringify({ olderThan: olderThan.toISOString() }) })
      return (r?.deleted ?? 0) as number
    },
  }
}
