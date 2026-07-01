import { ok, serverError } from '@lynkko/utils'
import { platform } from '@/lib/platform'
import { resolveV1Context } from '@/lib/api-v1'
import type { NextRequest } from 'next/server'

/**
 * GET /api/v1/license?tenant_id=<id>
 * Payload de licenciamiento que la app cachea localmente: suscripción + plan
 * (features/limits) + módulos activos. El appId se deriva de la API key.
 */
export async function GET(req: NextRequest) {
  const resolved = await resolveV1Context(req)
  if ('response' in resolved) return resolved.response
  const { appId, tenantId } = resolved.context

  try {
    const license = await platform.getLicense(tenantId, appId)
    return ok(license)
  } catch (error) {
    console.error('[v1/license]', error)
    return serverError('Failed to fetch license')
  }
}
