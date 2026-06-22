import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, notFound, serverError } from '@lynkko/utils'
import { sendWebhookAsync } from '@/lib/webhooks'
import type { NextRequest } from 'next/server'

interface Params {
  params: Promise<{ tenantId: string; appId: string }>
}

/**
 * POST /api/tenants/{tenantId}/apps/{appId}/toggle
 * Activa o desactiva una aplicación para un tenant
 * Body: { enabled: boolean }
 * Envía webhooks a la app para notificar del cambio
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, appId } = await params
    const body = await req.json()
    const { enabled } = body

    if (!tenantId || !appId) {
      return badRequest('Missing tenantId or appId')
    }

    if (typeof enabled !== 'boolean') {
      return badRequest('enabled must be a boolean')
    }

    // Verify app exists
    const [app] = await db
      .select()
      .from(platformSchema.platformApps)
      .where(eq(platformSchema.platformApps.id, appId))
      .limit(1)

    if (!app) {
      return notFound('App not found')
    }

    // Insert or update tenant app access
    await db
      .insert(platformSchema.tenantAppAccess)
      .values({
        tenantId,
        appId,
        isEnabled: enabled,
        enabledAt: enabled ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [platformSchema.tenantAppAccess.tenantId, platformSchema.tenantAppAccess.appId],
        set: {
          isEnabled: enabled,
          enabledAt: enabled ? new Date() : null,
          updatedAt: new Date(),
        },
      })

    // Get subscription info if enabled
    let subscription: any = null
    if (enabled) {
      const [sub] = await db
        .select()
        .from(platformSchema.subscriptions)
        .innerJoin(
          platformSchema.appPlans,
          eq(platformSchema.subscriptions.planId, platformSchema.appPlans.id)
        )
        .where(
          and(
            eq(platformSchema.subscriptions.tenantId, tenantId),
            eq(platformSchema.subscriptions.appId, appId)
          )
        )
        .limit(1)

      if (sub) {
        subscription = {
          id: sub.subscriptions.id,
          plan: {
            id: sub.app_plans.id,
            name: sub.app_plans.name,
            slug: sub.app_plans.slug,
          },
          period_end: sub.subscriptions.currentPeriodEnd.toISOString(),
          status: sub.subscriptions.status,
        }
      }
    }

    // Get active modules if enabled
    let activeModules: Record<string, boolean> = {}
    if (enabled) {
      const modules = await db
        .select({
          id: platformSchema.platformModules.id,
          slug: platformSchema.platformModules.slug,
        })
        .from(platformSchema.platformModules)
        .where(eq(platformSchema.platformModules.appId, appId))

      for (const module of modules) {
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

        activeModules[module.slug] = access?.isEnabled ?? true
      }
    }

    // Send webhook to app
    const eventType = enabled ? 'app_enabled' : 'app_disabled'
    sendWebhookAsync({
      event: eventType as any,
      tenant_id: tenantId,
      subscription_id: subscription?.id,
      plan: subscription?.plan,
      active_modules: activeModules,
      period_end: subscription?.period_end,
    })

    return ok({
      status: 'ok',
      tenant_id: tenantId,
      app_id: appId,
      enabled,
      subscription: subscription ? { id: subscription.id, plan: subscription.plan.name } : null,
      webhook_sent: true,
    })
  } catch (error) {
    console.error('Error toggling app:', error)
    return serverError('Failed to toggle app')
  }
}
