import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

interface Params {
  params: Promise<{ tenantId: string }>
}

interface MarketplaceApp {
  id: string
  name: string
  description: string | null
  url: string | null
  is_enabled: boolean
  current_subscription: {
    id: string
    plan_name: string
    status: string
    period_end: string
  } | null
  modules: Array<{
    id: string
    slug: string
    name: string
    description: string | null
    is_enabled: boolean
  }>
}

/**
 * GET /api/marketplace/{tenantId}
 * Marketplace centralizado: obtiene todas las apps y módulos disponibles para un tenant
 * Cada aplicación (Turnflow, PEC, etc.) consulta este endpoint para mostrar el marketplace
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await params

    if (!tenantId) {
      return badRequest('Missing tenantId')
    }

    // Get all active apps
    const apps = await db
      .select()
      .from(platformSchema.platformApps)
      .where(eq(platformSchema.platformApps.isActive, true))

    // For each app, get: tenant access, subscription, and modules
    const marketplaceApps: MarketplaceApp[] = await Promise.all(
      apps.map(async (app) => {
        // Get tenant access status
        const [access] = await db
          .select()
          .from(platformSchema.tenantAppAccess)
          .where(
            and(
              eq(platformSchema.tenantAppAccess.tenantId, tenantId),
              eq(platformSchema.tenantAppAccess.appId, app.id)
            )
          )
          .limit(1)

        // Get subscription (if any)
        const [subscription] = await db
          .select()
          .from(platformSchema.subscriptions)
          .innerJoin(
            platformSchema.appPlans,
            eq(platformSchema.subscriptions.planId, platformSchema.appPlans.id)
          )
          .where(
            and(
              eq(platformSchema.subscriptions.tenantId, tenantId),
              eq(platformSchema.subscriptions.appId, app.id)
            )
          )
          .limit(1)

        // Get all modules for this app with tenant's access status
        const modules = await db
          .select({
            id: platformSchema.platformModules.id,
            slug: platformSchema.platformModules.slug,
            name: platformSchema.platformModules.name,
            description: platformSchema.platformModules.description,
          })
          .from(platformSchema.platformModules)
          .where(eq(platformSchema.platformModules.appId, app.id))

        const modulesWithAccess = await Promise.all(
          modules.map(async (module) => {
            const [moduleAccess] = await db
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
              id: module.id,
              slug: module.slug,
              name: module.name,
              description: module.description,
              is_enabled: moduleAccess?.isEnabled ?? true,
            }
          })
        )

        return {
          id: app.id,
          name: app.name,
          description: app.description,
          url: app.url,
          is_enabled: access?.isEnabled ?? false,
          current_subscription: subscription
            ? {
                id: subscription.subscriptions.id,
                plan_name: subscription.app_plans.name,
                status: subscription.subscriptions.status,
                period_end: subscription.subscriptions.currentPeriodEnd.toISOString(),
              }
            : null,
          modules: modulesWithAccess,
        }
      })
    )

    return ok({
      tenant_id: tenantId,
      apps: marketplaceApps,
      total_apps: marketplaceApps.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching marketplace:', error)
    return serverError('Failed to fetch marketplace')
  }
}
