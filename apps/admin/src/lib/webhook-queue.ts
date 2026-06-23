import { db, platformSchema } from './db'
import { eq, and, or, lte, lt } from 'drizzle-orm'
import type { WebhookEvent } from './webhooks'

const RETRY_DELAYS = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  24 * 60 * 60 * 1000,
]

export async function queueWebhook(
  eventType: string,
  tenantId: string,
  appId: string,
  payload: WebhookEvent,
  webhookUrl: string
) {
  const [record] = await db
    .insert(platformSchema.webhookDeliveries)
    .values({
      eventType,
      tenantId,
      appId,
      payload: payload as any,
      webhookUrl,
      status: 'pending',
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: new Date(),
    })
    .returning()

  return record
}

export async function deliverWebhook(deliveryId: string): Promise<boolean> {
  const [delivery] = await db
    .select()
    .from(platformSchema.webhookDeliveries)
    .where(eq(platformSchema.webhookDeliveries.id, deliveryId))
    .limit(1)

  if (!delivery) return false
  if (delivery.status !== 'pending' && delivery.status !== 'failed') return false

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const payload = JSON.stringify(delivery.payload)
    const message = `${timestamp}.${payload}`

    const crypto = await import('crypto')
    const secret = process.env.PLATFORM_WEBHOOK_SECRET!
    const signature = crypto.createHmac('sha256', secret).update(message).digest('hex')

    const response = await fetch(delivery.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Platform-Signature': signature,
        'X-Platform-Timestamp': timestamp,
      },
      body: payload,
    })

    if (response.ok) {
      await db
        .update(platformSchema.webhookDeliveries)
        .set({
          status: 'delivered',
          deliveredAt: new Date(),
          httpStatus: response.status,
          attemptCount: (delivery.attemptCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(platformSchema.webhookDeliveries.id, deliveryId))
      return true
    } else {
      const responseBody = await response.text()
      await handleWebhookFailure(deliveryId, delivery, response.status, responseBody)
      return false
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await handleWebhookFailure(deliveryId, delivery, null, errorMessage)
    return false
  }
}

async function handleWebhookFailure(
  deliveryId: string,
  delivery: any,
  httpStatus: number | null,
  errorMessage: string
) {
  const nextAttempt = delivery.attemptCount + 1

  if (nextAttempt >= delivery.maxAttempts) {
    await db
      .update(platformSchema.webhookDeliveries)
      .set({ status: 'failed', httpStatus: httpStatus || 0, errorMessage, attemptCount: nextAttempt, updatedAt: new Date() })
      .where(eq(platformSchema.webhookDeliveries.id, deliveryId))
    console.error(`Webhook delivery failed after ${nextAttempt} attempts: ${delivery.webhookUrl}`)
  } else {
    const delayMs = RETRY_DELAYS[nextAttempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
    const nextRetryAt = new Date(Date.now() + delayMs)
    await db
      .update(platformSchema.webhookDeliveries)
      .set({ status: 'failed', httpStatus: httpStatus || 0, errorMessage, attemptCount: nextAttempt, nextRetryAt, updatedAt: new Date() })
      .where(eq(platformSchema.webhookDeliveries.id, deliveryId))
    console.log(`Webhook retry scheduled for ${nextRetryAt.toISOString()}: ${delivery.webhookUrl}`)
  }
}

export async function processPendingWebhooks() {
  const now = new Date()

  const pendingDeliveries = await db
    .select()
    .from(platformSchema.webhookDeliveries)
    .where(
      or(
        eq(platformSchema.webhookDeliveries.status, 'pending'),
        and(
          eq(platformSchema.webhookDeliveries.status, 'failed'),
          lte(platformSchema.webhookDeliveries.nextRetryAt, now)
        )
      )
    )

  let delivered = 0
  let failed = 0

  for (const delivery of pendingDeliveries) {
    const success = await deliverWebhook(delivery.id)
    if (success) delivered++
    else failed++
  }

  return { delivered, failed, total: pendingDeliveries.length }
}

export async function getWebhookDeliveryHistory(appId: string, limit: number = 50) {
  return db
    .select()
    .from(platformSchema.webhookDeliveries)
    .where(eq(platformSchema.webhookDeliveries.appId, appId))
    .limit(limit)
    .orderBy(platformSchema.webhookDeliveries.createdAt)
}

export async function archiveOldDeliveries(olderThanDays: number = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  return db
    .update(platformSchema.webhookDeliveries)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(
      and(
        or(
          eq(platformSchema.webhookDeliveries.status, 'delivered'),
          eq(platformSchema.webhookDeliveries.status, 'failed')
        ),
        lt(platformSchema.webhookDeliveries.createdAt, cutoffDate)
      )
    )
}
