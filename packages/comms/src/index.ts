import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ─── Schema (outbox) ──────────────────────────────────────────────────────────

/**
 * Outbox unificado: un registro por cada intento de envío (email o push),
 * con su estado y proveedor. Base para idempotencia, reintentos y analytics
 * de entrega. Incluir en el schema Drizzle del servicio `lynkko-comms`.
 */
export const messages = pgTable('messages', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:       text('tenant_id').notNull(),
  appId:          text('app_id').notNull(),
  channel:        text('channel').notNull(),                       // 'email' | 'push'
  recipient:      text('recipient').notNull(),                     // email o resumen 'push:N'
  subject:        text('subject'),                                 // subject/title
  status:         text('status').notNull().default('queued'),      // queued|sent|failed|partial
  provider:       text('provider'),                                // 'resend' | 'web-push'
  providerId:     text('provider_id'),
  error:          text('error'),
  idempotencyKey: text('idempotency_key'),
  meta:           jsonb('meta').$type<Record<string, unknown>>(),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  sentAt:         timestamp('sent_at'),
}, (t) => [
  index('messages_tenant_idx').on(t.tenantId),
  index('messages_channel_idx').on(t.channel),
  index('messages_status_idx').on(t.status),
  // Único solo sobre claves no nulas → idempotencia opt-in por request.
  uniqueIndex('messages_idem_idx').on(t.idempotencyKey),
])

export const commsSchema = { messages }
export type Message = typeof messages.$inferSelect

// ─── Tipos de la API ──────────────────────────────────────────────────────────

export type Channel = 'email' | 'push'

export interface SendEmailInput {
  tenantId: string
  appId: string
  idempotencyKey?: string
  to: string | string[]
  subject: string
  /** HTML explícito. Si se omite, se arma desde title/content con el template Lynkko. */
  html?: string
  title?: string
  content?: string
  ctaText?: string
  ctaUrl?: string
}

export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

export interface SendPushInput {
  tenantId: string
  appId: string
  idempotencyKey?: string
  subscriptions: PushTarget[]
  title: string
  body: string
  url?: string
}

export interface SendResult {
  id: string
  channel: Channel
  status: string
  deduped?: boolean
}

// ─── HTTP client (para las apps del ecosistema) ───────────────────────────────

export interface CommsClient {
  sendEmail(input: SendEmailInput): Promise<SendResult>
  sendPush(input: SendPushInput): Promise<SendResult>
  listMessages(query: {
    tenantId: string
    channel?: Channel
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ messages: Message[] }>
}

export function createCommsHttpClient(baseUrl: string, apiKey: string): CommsClient {
  const root = baseUrl.replace(/\/$/, '')

  async function call(path: string, init?: RequestInit): Promise<unknown> {
    const res = await fetch(`${root}/api${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
    if (!res.ok) {
      throw new Error(`comms API ${path} → ${res.status} ${await res.text()}`)
    }
    return res.status === 204 ? null : res.json()
  }

  const qs = (params: Record<string, string | number | boolean | undefined>) =>
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&')

  return {
    sendEmail: (input) =>
      call('/send', {
        method: 'POST',
        body: JSON.stringify({ channel: 'email', ...input }),
      }) as Promise<SendResult>,
    sendPush: (input) =>
      call('/send', {
        method: 'POST',
        body: JSON.stringify({ channel: 'push', ...input }),
      }) as Promise<SendResult>,
    listMessages: (query) =>
      call(`/messages?${qs(query)}`) as Promise<{ messages: Message[] }>,
  }
}
