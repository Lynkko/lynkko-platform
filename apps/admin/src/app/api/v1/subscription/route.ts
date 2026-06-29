import { ok, notFound, serverError } from '@lynkko/utils'
import { platform } from '@/lib/platform'
import { resolveV1Context } from '@/lib/api-v1'
import type { NextRequest } from 'next/server'

/**
 * GET /api/v1/subscription?tenant_id=<id>
 * Suscripción cruda + plan. El appId se deriva de la API key.
 */
export async function GET(req: NextRequest) {
  const resolved = await resolveV1Context(req)
  if ('response' in resolved) return resolved.response
  const { appId, tenantId } = resolved.context

  try {
    const sub = await platform.getSubscription(tenantId, appId)
    if (!sub) return notFound('No subscription found for this tenant')
    return ok(sub)
  } catch (error) {
    console.error('[v1/subscription]', error)
    return serverError('Failed to fetch subscription')
  }
}
