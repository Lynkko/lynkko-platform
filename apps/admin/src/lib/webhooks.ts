import crypto from 'crypto'

const TURNFLOW_WEBHOOK_URL = 'https://turnflow.lynkko.co/api/platform/webhook'
const PLATFORM_WEBHOOK_SECRET = process.env.PLATFORM_WEBHOOK_SECRET!

export interface WebhookEvent {
  event: 'subscription_activated' | 'plan_changed' | 'subscription_suspended' | 'subscription_canceled'
  tenant_id: string
  subscription_id: string
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
  sendWebhook(event, appUrl).catch(error => {
    console.error('Async webhook error:', error)
  })
}
