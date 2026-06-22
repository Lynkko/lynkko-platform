import { db, platformSchema } from './db'
import { eq } from 'drizzle-orm'
import type { WebhookEvent } from './webhooks'

interface WebhookDelivery {
  id: string
  eventType: string
  tenantId: string
  appId: string
  payload: WebhookEvent
  webhookUrl: string
  attemptCount: number
  maxAttempts: number
  nextRetryAt: Date | null
}

const RETRY_DELAYS = [
  60 * 1000,        // 1 minute
  5 * 60 * 1000,    // 5 minutes
  15 * 60 * 1000,   // 15 minutes
  60 * 60 * 1000,   // 1 hour
  24 * 60 * 60 * 1000, // 24 hours
]

/**
 * Queue a webhook for delivery with retry support
 */
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
      payload,
      webhookUrl,
      status: 'pending',
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: new Date(), // Start immediately
    })
    .returning()

  return record
}

/**
 * Attempt to deliver a webhook
 */
export async function deliverWebhook(deliveryId: string): Promise<boolean> {
  const [delivery] = await db
    .select()
    .from(platformSchema.webhookDeliveries)
    .where(eq(platformSchema.webhookDeliveries.id, deliveryId))
    .limit(1)

  if (!delivery) {
    return false
  }

  if (delivery.status !== 'pending' && delivery.status !== 'failed') {
    return false
  }

  try {
    // Sign webhook
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const payload = JSON.stringify(delivery.payload)
    const message = `${timestamp}.${payload}`

    const crypto = await import('crypto')
    const secret = process.env.PLATFORM_WEBHOOK_SECRET!
    const signature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex')

    // Send webhook
    const response = await fetch(delivery.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Platform-Signature': signature,
        'X-Platform-Timestamp': timestamp,
      },
      body: payload,
      timeout: 10000, // 10 second timeout
    })

    if (response.ok) {
      // Success
      await db
        .update(platformSchema.webhookDeliveries)
        .set({
          status: 'delivered',
          deliveredAt: new Date(),
          httpStatus: response.status,
          attemptCount: (delivery.attemptCount || 0) + 1,
        })
        .where(eq(platformSchema.webhookDeliveries.id, deliveryId))

      return true
    } else {
      // Non-200 response
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

/**
 * Handle webhook delivery failure and schedule retry
 */
async function handleWebhookFailure(
  deliveryId: string,
  delivery: any,
  httpStatus: number | null,
  errorMessage: string
) {
  const nextAttempt = delivery.attemptCount + 1

  if (nextAttempt >= delivery.maxAttempts) {
    // Max retries reached
    await db
      .update(platformSchema.webhookDeliveries)
      .set({
        status: 'failed',
        httpStatus: httpStatus || 0,
        errorMessage,
        attemptCount: nextAttempt,
      })
      .where(eq(platformSchema.webhookDeliveries.id, deliveryId))

    console.error(
      `Webhook delivery failed after ${nextAttempt} attempts: ${delivery.webhookUrl}`
    )
  } else {
    // Schedule retry
    const delayMs = RETRY_DELAYS[nextAttempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
    const nextRetryAt = new Date(Date.now() + delayMs)

    await db
      .update(platformSchema.webhookDeliveries)
      .set({
        status: 'failed',
        httpStatus: httpStatus || 0,
        errorMessage,
        attemptCount: nextAttempt,
        nextRetryAt,
      })
      .where(eq(platformSchema.webhookDeliveries.id, deliveryId))

    console.log(
      `Webhook retry scheduled for ${nextRetryAt.toISOString()}: ${delivery.webhookUrl}`
    )
  }
}

/**
 * Process pending webhooks (call this from cron job)
 */
export async function processPendingWebhooks() {
  const now = new Date()

  // Get all pending deliveries that are due for retry
  const pendingDeliveries = await db
    .select()
    .from(platformSchema.webhookDeliveries)
    .where(
      db.and(
        db.or(
          eq(platformSchema.webhookDeliveries.status, 'pending'),
          db.and(
            eq(platformSchema.webhookDeliveries.status, 'failed'),
            db.lte(platformSchema.webhookDeliveries.nextRetryAt, now)
          )
        )
      )
    )

  let delivered = 0
  let failed = 0

  for (const delivery of pendingDeliveries) {
    const success = await deliverWebhook(delivery.id)
    if (success) {
      delivered++
    } else {
      failed++
    }
  }

  return { delivered, failed, total: pendingDeliveries.length }
}

/**
 * Get webhook delivery history for an app
 */
export async function getWebhookDeliveryHistory(appId: string, limit: number = 50) {
  return db
    .select()
    .from(platformSchema.webhookDeliveries)
    .where(eq(platformSchema.webhookDeliveries.appId, appId))
    .limit(limit)
    .orderBy(platformSchema.webhookDeliveries.createdAt)
}

/**
 * Archive old completed deliveries (cleanup)
 */
export async function archiveOldDeliveries(olderThanDays: number = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  const result = await db
    .update(platformSchema.webhookDeliveries)
    .set({ status: 'archived' })
    .where(
      db.and(
        db.or(
          eq(platformSchema.webhookDeliveries.status, 'delivered'),
          eq(platformSchema.webhookDeliveries.status, 'failed')
        ),
        db.lt(platformSchema.webhookDeliveries.createdAt, cutoffDate)
      )
    )

  return result
}
