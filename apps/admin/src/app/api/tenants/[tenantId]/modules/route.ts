import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, notFound, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

interface Params {
  params: Promise<{ tenantId: string }>
}

/**
 * GET /api/tenants/{tenantId}/modules
 * Obtiene todos los módulos disponibles con su estado de activación para este tenant
 * Parámetro opcional: ?app_id=turnflow (filtrar por app específica)
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await params
    const { searchParams } = req.nextUrl
    const appId = searchParams.get('app_id')

    if (!tenantId) {
      return badRequest('Missing tenantId')
    }

    // Get all modules (optionally filtered by app_id)
    const modules = await db
      .select({
        id: platformSchema.platformModules.id,
        appId: platformSchema.platformModules.appId,
        slug: platformSchema.platformModules.slug,
        name: platformSchema.platformModules.name,
        description: platformSchema.platformModules.description,
        isActive: platformSchema.platformModules.isActive,
      })
      .from(platformSchema.platformModules)
      .where(
        appId
          ? eq(platformSchema.platformModules.appId, appId)
          : undefined
      )

    // For each module, get the tenant's access status
    const modulesWithAccess = await Promise.all(
      modules.map(async (module) => {
        const [access] = await db
          .select({
            isEnabled: platformSchema.tenantModuleAccess.isEnabled,
          })
          .from(platformSchema.tenantModuleAccess)
          .where(
            and(
              eq(platformSchema.tenantModuleAccess.tenantId, tenantId),
              eq(platformSchema.tenantModuleAccess.moduleId, module.id)
            )
          )
          .limit(1)

        return {
          ...module,
          isEnabled: access?.isEnabled ?? true, // default to enabled if no explicit record
        }
      })
    )

    return ok({
      tenant_id: tenantId,
      modules: modulesWithAccess,
      total: modulesWithAccess.length,
    })
  } catch (error) {
    console.error('Error fetching modules:', error)
    return serverError('Failed to fetch modules')
  }
}
