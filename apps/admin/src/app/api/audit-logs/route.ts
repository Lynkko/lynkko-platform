import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

/**
 * GET /api/audit-logs
 * List audit logs with filtering
 * Query: ?resource_type=plan&resource_id=plan_1&user_id=user_123&action=update&limit=50
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const resourceType = searchParams.get('resource_type')
    const resourceId = searchParams.get('resource_id')
    const userId = searchParams.get('user_id')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') ?? '100')

    let query = db.select().from(platformSchema.auditLogs)

    if (resourceType && resourceId) {
      query = query.where(
        and(
          eq(platformSchema.auditLogs.resourceType, resourceType),
          eq(platformSchema.auditLogs.resourceId, resourceId)
        )
      )
    } else if (userId) {
      query = query.where(eq(platformSchema.auditLogs.userId, userId))
    } else if (action) {
      query = query.where(eq(platformSchema.auditLogs.action, action))
    }

    const logs = await query
      .limit(limit)
      .orderBy(db.desc(platformSchema.auditLogs.createdAt))

    return ok({
      logs: logs.map((log: any) => ({
        id: log.id,
        userId: log.userId,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        action: log.action,
        changes: log.changes,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        status: log.status,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
      })),
      total: logs.length,
      filtered_by: {
        resource_type: resourceType,
        resource_id: resourceId,
        user_id: userId,
        action,
      },
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return serverError('Failed to fetch audit logs')
  }
}
