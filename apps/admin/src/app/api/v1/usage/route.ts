import { ok, badRequest, serverError } from '@lynkko/utils'
import { platform } from '@/lib/platform'
import { resolveV1Context } from '@/lib/api-v1'
import type { NextRequest } from 'next/server'

/**
 * GET /api/v1/usage?tenant_id=<id>
 * Resumen de uso reportado por la app.
 */
export async function GET(req: NextRequest) {
  const resolved = await resolveV1Context(req)
  if ('response' in resolved) return resolved.response
  const { tenantId } = resolved.context

  try {
    const usage = await platform.getUsageSummary(tenantId)
    return ok({ usage })
  } catch (error) {
    console.error('[v1/usage]', error)
    return serverError('Failed to fetch usage')
  }
}

/**
 * POST /api/v1/usage?tenant_id=<id>   body: { metrics: Record<string, number> }
 * Reporte de métricas de uso (reemplaza /api/apps/turnflow/status-report).
 */
export async function POST(req: NextRequest) {
  const resolved = await resolveV1Context(req)
  if ('response' in resolved) return resolved.response
  const { appId, tenantId } = resolved.context

  let body: { metrics?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const metrics = body.metrics
  if (!metrics || typeof metrics !== 'object') {
    return badRequest('Missing or invalid metrics object')
  }

  try {
    let recorded = 0
    for (const [metric, value] of Object.entries(metrics)) {
      if (typeof value !== 'number') continue
      await platform.recordUsage(tenantId, appId, metric, value)
      recorded++
    }
    return ok({ status: 'ok', tenant_id: tenantId, metrics_recorded: recorded })
  } catch (error) {
    console.error('[v1/usage POST]', error)
    return serverError('Failed to record usage')
  }
}
