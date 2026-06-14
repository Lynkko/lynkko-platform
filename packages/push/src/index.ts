import webpush from 'web-push'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  renotify?: boolean
  data?: Record<string, unknown>
}

export interface PushConfig {
  vapidPublicKey: string
  vapidPrivateKey: string
  subject: string
}

export interface PushResult {
  success: boolean
  endpoint: string
  error?: string
  /** true cuando el endpoint está expirado y debe eliminarse de la DB */
  expired?: boolean
}

// ─── Configuración global ─────────────────────────────────────────────────────

let configured = false

/**
 * Configura VAPID una vez por proceso. Llamar en el inicio de la app
 * o lazy-load en el primer uso.
 *
 * @example
 * configurePush({
 *   vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
 *   vapidPrivateKey: process.env.VAPID_PRIVATE_KEY!,
 *   subject: 'mailto:hola@lynkko.co',
 * })
 */
export function configurePush(config: PushConfig): void {
  webpush.setVapidDetails(config.subject, config.vapidPublicKey, config.vapidPrivateKey)
  configured = true
}

function ensureConfigured(): void {
  if (configured) return

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:hola@lynkko.co'

  if (!publicKey || !privateKey) {
    throw new Error(
      '[@lynkko/push] VAPID no configurado. Llama configurePush() o define ' +
      'NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en tus variables de entorno.',
    )
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

// ─── Envío individual ─────────────────────────────────────────────────────────

/**
 * Envía una notificación push a una suscripción individual.
 * Retorna { success, expired } para que el llamador pueda
 * eliminar suscripciones vencidas de la DB.
 */
export async function sendPush(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<PushResult> {
  ensureConfigured()

  const body = JSON.stringify(payload)

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      body,
    )
    return { success: true, endpoint: subscription.endpoint }
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode
    const expired = statusCode === 404 || statusCode === 410

    return {
      success: false,
      endpoint: subscription.endpoint,
      error: err instanceof Error ? err.message : String(err),
      expired,
    }
  }
}

// ─── Envío masivo ─────────────────────────────────────────────────────────────

/**
 * Envía una notificación a múltiples suscripciones en paralelo (best-effort).
 * Retorna los resultados para que el llamador elimine las expiradas.
 *
 * @example
 * const results = await sendPushToMany(subscriptions, payload)
 * const expired = results.filter(r => r.expired).map(r => r.endpoint)
 * await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, expired))
 */
export async function sendPushToMany(
  subscriptions: PushSubscription[],
  payload: PushPayload,
): Promise<PushResult[]> {
  if (subscriptions.length === 0) return []

  const results = await Promise.allSettled(
    subscriptions.map(sub => sendPush(sub, payload)),
  )

  return results.map(r =>
    r.status === 'fulfilled'
      ? r.value
      : { success: false, endpoint: '', error: String(r.reason) },
  )
}

// ─── Helper: generar VAPID keys ───────────────────────────────────────────────

/**
 * Genera un par de claves VAPID nuevas.
 * Usar una sola vez y guardar en variables de entorno.
 *
 * @example
 * // scripts/generate-vapid.ts
 * import { generateVapidKeys } from '@lynkko/push'
 * console.log(generateVapidKeys())
 */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys()
}
