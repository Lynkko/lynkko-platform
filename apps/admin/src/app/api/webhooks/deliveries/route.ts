import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

/**
 * GET /api/webhooks/deliveries
 * List webhook deliveries with filtering
 * Query: ?app_id=turnflow&status=failed&limit=50
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const appId = searchParams.get('app_id')
    const status = searchParams.get('status') // pending, delivered, failed, archived
    const eventType = searchParams.get('event_type')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    let query = db.select().from(platformSchema.webhookDeliveries)

    if (appId) {
      query = query.where(eq(platformSchema.webhookDeliveries.appId, appId))
    }

    if (status) {
      query = query.where(eq(platformSchema.webhookDeliveries.status, status))
    }

    if (eventType) {
      query = query.where(eq(platformSchema.webhookDeliveries.eventType, eventType))
    }

    const deliveries = await query
      .limit(limit)
      .orderBy(db.desc(platformSchema.webhookDeliveries.createdAt))

    return ok({
      deliveries: deliveries.map((d: any) => ({
        id: d.id,
        eventType: d.eventType,
        tenantId: d.tenantId,
        appId: d.appId,
        status: d.status,
        httpStatus: d.httpStatus,
        attemptCount: d.attemptCount,
        maxAttempts: d.maxAttempts,
        errorMessage: d.errorMessage,
        deliveredAt: d.deliveredAt,
        nextRetryAt: d.nextRetryAt,
        createdAt: d.createdAt,
        // Don't include full payload in list view
      })),
      total: deliveries.length,
      filtered_by: {
        app_id: appId,
        status,
        event_type: eventType,
      },
    })
  } catch (error) {
    console.error('Error fetching webhook deliveries:', error)
    return serverError('Failed to fetch webhook deliveries')
  }
}
