import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { db, platformSchema } from '@/lib/db'

const PLATFORM_WEBHOOK_SECRET = process.env.PLATFORM_WEBHOOK_SECRET!

export interface WebhookEvent {
  event: 'subscription_activated' | 'plan_changed' | 'subscription_suspended' | 'subscription_canceled' | 'subscription_updated' | 'module_enabled' | 'module_disabled' | 'app_enabled' | 'app_disabled'
  tenant_id: string
  tenant_name?: string
  tenant_slug?: string
  tenant_email?: string
  subscription_id?: string
  module_id?: string
  module_slug?: string
  module_name?: string
  plan?: {
    id: string
    name: string
    slug: string
  }
  active_modules?: Record<string, boolean>
  period_end?: string
}

/**
 * Resuelve la URL de webhook de CUALQUIER app desde `platform_apps.url`.
 * Cada app del ecosistema expone `POST /api/platform/webhook`. Devuelve null si la
 * app no existe o no tiene URL configurada (en cuyo caso se omite el envío).
 * Esto reemplaza el hardcode a turnflow: platform empuja a la app dueña del tenant.
 */
async function resolveWebhookUrl(appId: string): Promise<string | null> {
  const [app] = await db
    .select({ url: platformSchema.platformApps.url })
    .from(platformSchema.platformApps)
    .where(eq(platformSchema.platformApps.id, appId))
    .limit(1)
  if (!app?.url) return null
  return `${app.url.replace(/\/+$/, '')}/api/platform/webhook`
}

function signWebhook(payload: string, secret: string): { signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const message = `${timestamp}.${payload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex')

  return { signature, timestamp }
}

export async function sendWebhook(event: WebhookEvent, appUrl: string): Promise<boolean> {
  try {
    const payload = JSON.stringify(event)
    const { signature, timestamp } = signWebhook(payload, PLATFORM_WEBHOOK_SECRET)

    const response = await fetch(appUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Platform-Signature': signature,
        'X-Platform-Timestamp': timestamp,
      },
      body: payload,
    })

    if (!response.ok) {
      console.error(`Webhook delivery failed: ${response.status} ${response.statusText}`)
      return false
    }

    return true
  } catch (error) {
    console.error('Webhook delivery error:', error)
    return false
  }
}

/**
 * Encola (con reintentos) un webhook hacia la app dueña del tenant. El `appId`
 * determina la URL destino vía `platform_apps.url`. Si la app no tiene URL, se omite.
 */
export async function sendWebhookAsync(event: WebhookEvent, appId: string): Promise<void> {
  const url = await resolveWebhookUrl(appId)
  if (!url) {
    console.warn(`[webhook] app '${appId}' sin URL en platform_apps; se omite el envío`)
    return
  }

  try {
    const { queueWebhook } = await import('./webhook-queue')
    await queueWebhook(event.event, event.tenant_id, appId, event, url)
  } catch (error) {
    console.error('Failed to queue webhook:', error)
    // Fallback a entrega directa
    sendWebhook(event, url).catch(err => {
      console.error('Async webhook error:', err)
    })
  }
}
