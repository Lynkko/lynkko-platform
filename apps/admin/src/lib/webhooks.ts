import crypto from 'crypto'

const TURNFLOW_WEBHOOK_URL = process.env.TURNFLOW_WEBHOOK_URL ?? 'https://turnflow.lynkko.co/api/platform/webhook'
const PLATFORM_WEBHOOK_SECRET = process.env.PLATFORM_WEBHOOK_SECRET!

export interface WebhookEvent {
  event: 'subscription_activated' | 'plan_changed' | 'subscription_suspended' | 'subscription_canceled' | 'subscription_updated' | 'module_enabled' | 'module_disabled' | 'app_enabled' | 'app_disabled'
  tenant_id: string
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

function signWebhook(payload: string, secret: string): { signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const message = `${timestamp}.${payload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex')

  return { signature, timestamp }
}

export async function sendWebhook(event: WebhookEvent, appUrl?: string): Promise<boolean> {
  try {
    const url = appUrl || TURNFLOW_WEBHOOK_URL
    const payload = JSON.stringify(event)
    const { signature, timestamp } = signWebhook(payload, PLATFORM_WEBHOOK_SECRET)

    const response = await fetch(url, {
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

export async function sendWebhookAsync(event: WebhookEvent, appUrl?: string): Promise<void> {
  // Send webhook asynchronously without awaiting
  // This prevents webhook delivery from blocking the request

  // Option 1: Direct delivery (old way, for backwards compatibility)
  // sendWebhook(event, appUrl).catch(error => {
  //   console.error('Async webhook error:', error)
  // })

  // Option 2: Queue for retry (new way, Phase 3)
  try {
    const { queueWebhook } = await import('./webhook-queue')
    const url = appUrl || TURNFLOW_WEBHOOK_URL
    const appId = event.subscription_id ? 'turnflow' : 'unknown'

    await queueWebhook(
      event.event,
      event.tenant_id,
      appId,
      event,
      url
    )
  } catch (error) {
    console.error('Failed to queue webhook:', error)
    // Fallback to direct delivery
    sendWebhook(event, appUrl).catch(err => {
      console.error('Async webhook error:', err)
    })
  }
}
