import { db, platformSchema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, notFound, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

interface Params {
  params: Promise<{ deliveryId: string }>
}

/**
 * GET /api/webhooks/deliveries/{deliveryId}
 * Get detailed webhook delivery information
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { deliveryId } = await params

    const [delivery] = await db
      .select()
      .from(platformSchema.webhookDeliveries)
      .where(eq(platformSchema.webhookDeliveries.id, deliveryId))
      .limit(1)

    if (!delivery) {
      return notFound('Webhook delivery not found')
    }

    return ok({
      delivery: {
        id: delivery.id,
        eventType: delivery.eventType,
        tenantId: delivery.tenantId,
        appId: delivery.appId,
        webhookUrl: delivery.webhookUrl,
        payload: delivery.payload,
        status: delivery.status,
        httpStatus: delivery.httpStatus,
        responseBody: delivery.responseBody,
        errorMessage: delivery.errorMessage,
        attemptCount: delivery.attemptCount,
        maxAttempts: delivery.maxAttempts,
        nextRetryAt: delivery.nextRetryAt,
        deliveredAt: delivery.deliveredAt,
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error fetching webhook delivery:', error)
    return serverError('Failed to fetch webhook delivery')
  }
}
