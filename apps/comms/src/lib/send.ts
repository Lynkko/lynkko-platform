import { eq } from 'drizzle-orm'
import { messages, type SendResult } from '@lynkko/comms'
import { sendEmail, lynkkoEmailTemplate } from '@lynkko/email'
import { sendPushToMany, type PushSubscription } from '@lynkko/push'
import { db } from './db'

interface SendBody {
  channel?: string
  tenantId?: string
  appId?: string
  idempotencyKey?: string
  // email
  to?: string | string[]
  subject?: string
  html?: string
  title?: string
  content?: string
  ctaText?: string
  ctaUrl?: string
  // push
  subscriptions?: PushSubscription[]
  body?: string
  url?: string
}

async function findByIdempotency(key?: string) {
  if (!key) return null
  const [row] = await db
    .select()
    .from(messages)
    .where(eq(messages.idempotencyKey, key))
    .limit(1)
  return row ?? null
}

/** Punto de entrada del envío unificado. Valida, deduplica, despacha, registra. */
export async function handleSend(body: SendBody): Promise<SendResult> {
  const { channel, tenantId, appId, idempotencyKey } = body
  if (!tenantId || !appId) throw new Error('Missing tenantId or appId')

  const dup = await findByIdempotency(idempotencyKey)
  if (dup) {
    return { id: dup.id, channel: dup.channel as SendResult['channel'], status: dup.status, deduped: true }
  }

  if (channel === 'email') return sendEmailMessage(body)
  if (channel === 'push') return sendPushMessage(body)
  throw new Error(`Unsupported channel: ${channel ?? '(none)'}`)
}

async function sendEmailMessage(b: SendBody): Promise<SendResult> {
  if (!b.to || !b.subject) throw new Error('email requires to + subject')
  const recipients = Array.isArray(b.to) ? b.to : [b.to]
  const html =
    b.html ??
    lynkkoEmailTemplate({
      title: b.title ?? b.subject,
      content: b.content ?? '',
      ctaText: b.ctaText,
      ctaUrl: b.ctaUrl,
    })

  const [msg] = await db
    .insert(messages)
    .values({
      tenantId: b.tenantId!,
      appId: b.appId!,
      channel: 'email',
      recipient: recipients.join(', '),
      subject: b.subject,
      status: 'queued',
      provider: 'resend',
      idempotencyKey: b.idempotencyKey ?? null,
      meta: { to: recipients },
    })
    .returning()

  const res = await sendEmail({ to: b.to, subject: b.subject, html })

  await db
    .update(messages)
    .set({
      status: res.success ? 'sent' : 'failed',
      providerId: res.id ?? null,
      error: res.error ?? null,
      sentAt: res.success ? new Date() : null,
    })
    .where(eq(messages.id, msg.id))

  return { id: msg.id, channel: 'email', status: res.success ? 'sent' : 'failed' }
}

async function sendPushMessage(b: SendBody): Promise<SendResult> {
  if (!b.title || !b.body) throw new Error('push requires title + body')
  const subs = b.subscriptions ?? []

  const [msg] = await db
    .insert(messages)
    .values({
      tenantId: b.tenantId!,
      appId: b.appId!,
      channel: 'push',
      recipient: `push:${subs.length}`,
      subject: b.title,
      status: 'queued',
      provider: 'web-push',
      idempotencyKey: b.idempotencyKey ?? null,
      meta: { count: subs.length, url: b.url },
    })
    .returning()

  const results = await sendPushToMany(subs, { title: b.title, body: b.body, url: b.url })
  const okCount = results.filter((r) => r.success).length
  const status =
    subs.length > 0 && okCount === 0 ? 'failed' : okCount < subs.length ? 'partial' : 'sent'

  await db
    .update(messages)
    .set({
      status,
      error:
        status === 'sent'
          ? null
          : JSON.stringify(results.filter((r) => !r.success).map((r) => r.error)),
      sentAt: okCount > 0 ? new Date() : null,
    })
    .where(eq(messages.id, msg.id))

  return { id: msg.id, channel: 'push', status }
}
