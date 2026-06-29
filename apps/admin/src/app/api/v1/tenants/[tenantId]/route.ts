import { ok, unauthorized, forbidden, notFound, serverError } from '@lynkko/utils'
import { platform } from '@/lib/platform'
import { validateApiKeyMiddleware } from '@/lib/api-middleware'
import type { NextRequest } from 'next/server'

/**
 * GET /api/v1/tenants/:tenantId
 * Detalle del tenant. Si la API key es tenant-scoped, solo puede leer su tenant.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params
  const ctx = await validateApiKeyMiddleware(req)
  if (!ctx) return unauthorized('Invalid or missing API key')
  if (ctx.tenantId && ctx.tenantId !== tenantId) {
    return forbidden('API key is scoped to a different tenant')
  }

  try {
    const tenant = await platform.getTenant(tenantId)
    if (!tenant) return notFound('Tenant not found')
    return ok(tenant)
  } catch (error) {
    console.error('[v1/tenants/:id]', error)
    return serverError('Failed to fetch tenant')
  }
}
