import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, notFound, serverError, unauthorized } from '@lynkko/utils'
import { sendWebhookAsync } from '@/lib/webhooks'
import type { NextRequest } from 'next/server'

interface Params {
  params: Promise<{ tenantId: string; moduleId: string }>
}

/**
 * POST /api/tenants/{tenantId}/modules/{moduleId}/toggle
 * Activa o desactiva un módulo para un tenant
 * Body: { enabled: boolean }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, moduleId } = await params
    const body = await req.json()
    const { enabled } = body

    if (!tenantId || !moduleId) {
      return badRequest('Missing tenantId or moduleId')
    }

    if (typeof enabled !== 'boolean') {
      return badRequest('enabled must be a boolean')
    }

    // Get module details
    const [module] = await db
      .select()
      .from(platformSchema.platformModules)
      .where(eq(platformSchema.platformModules.id, moduleId))
      .limit(1)

    if (!module) {
      return notFound('Module not found')
    }

    // Insert or update tenant module access
    await db
      .insert(platformSchema.tenantModuleAccess)
      .values({
        tenantId,
        appId: module.appId,
        moduleId,
        isEnabled: enabled,
      })
      .onConflictDoUpdate({
        target: [platformSchema.tenantModuleAccess.tenantId, platformSchema.tenantModuleAccess.moduleId],
        set: { isEnabled: enabled },
      })

    // Send webhook to the app if it's a known app
    if (module.appId === 'turnflow') {
      const eventType = enabled ? 'module_enabled' : 'module_disabled'
      sendWebhookAsync({
        event: eventType as any, // TypeScript issue, but webhook supports it
        tenant_id: tenantId,
        module_id: moduleId,
        module_slug: module.slug,
        module_name: module.name,
      })
    }

    return ok({
      status: 'ok',
      tenant_id: tenantId,
      module_id: moduleId,
      module_slug: module.slug,
      enabled,
      webhook_sent: module.appId === 'turnflow',
    })
  } catch (error) {
    console.error('Error toggling module:', error)
    return serverError('Failed to toggle module')
  }
}
