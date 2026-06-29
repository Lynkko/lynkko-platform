import { unauthorized, forbidden, badRequest } from '@lynkko/utils'
import { validateApiKeyMiddleware, type ApiContext } from './api-middleware'
import type { NextRequest } from 'next/server'
import type { LynkkoAppId } from '@lynkko/platform'

/**
 * Contexto de una llamada a /api/v1/*. La app se deriva de la API key
 * (cada key está atada a un appId), no de la URL.
 */
export interface V1Context {
  appId:    LynkkoAppId
  tenantId: string
  ctx:      ApiContext
}

/**
 * Resuelve el contexto de una ruta v1: valida la API key, deriva el appId, y
 * resuelve el tenantId. El tenant viene de la key (si es tenant-scoped) o del
 * parámetro `tenant_id`; si la key es tenant-scoped, ambos deben coincidir.
 *
 * Devuelve `{ context }` en éxito o `{ response }` con el error a retornar.
 */
export async function resolveV1Context(
  req: NextRequest,
): Promise<{ context: V1Context } | { response: Response }> {
  const ctx = await validateApiKeyMiddleware(req)
  if (!ctx) return { response: unauthorized('Invalid or missing API key') }

  const paramTenant = req.nextUrl.searchParams.get('tenant_id')
  const tenantId = ctx.tenantId ?? paramTenant

  if (!tenantId) return { response: badRequest('Missing tenant_id') }
  if (ctx.tenantId && paramTenant && ctx.tenantId !== paramTenant) {
    return { response: forbidden('API key is scoped to a different tenant') }
  }

  return { context: { appId: ctx.appId as LynkkoAppId, tenantId, ctx } }
}
