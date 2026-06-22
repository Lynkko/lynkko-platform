import { db, platformSchema } from '@/lib/db'
import { ok, badRequest, unauthorized, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY!

export async function POST(req: NextRequest) {
  try {
    // Verify API key
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== PLATFORM_API_KEY) {
      return unauthorized('Invalid or missing API key')
    }

    const body = await req.json()
    const { tenant_id, metrics } = body

    if (!tenant_id) {
      return badRequest('Missing tenant_id')
    }

    if (!metrics || typeof metrics !== 'object') {
      return badRequest('Missing or invalid metrics object')
    }

    // Record each metric for today
    const today = new Date().toISOString().slice(0, 10)
    const appId = 'turnflow'

    // Store metrics in usage_records
    for (const [metric, value] of Object.entries(metrics)) {
      if (typeof value !== 'number') continue

      await db
        .insert(platformSchema.usageRecords)
        .values({
          tenantId: tenant_id,
          appId,
          metric,
          value,
          period: today,
        })
        .onConflictDoUpdate({
          target: [
            platformSchema.usageRecords.tenantId,
            platformSchema.usageRecords.appId,
            platformSchema.usageRecords.metric,
            platformSchema.usageRecords.period,
          ],
          set: {
            value,
            updatedAt: new Date(),
          },
        })
    }

    return ok({
      status: 'ok',
      tenant_id,
      metrics_recorded: Object.keys(metrics).length,
      period: today,
    })
  } catch (error) {
    console.error('Status report error:', error)
    return serverError('Failed to process status report')
  }
}
