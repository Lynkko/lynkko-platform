import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, unauthorized, notFound, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY!

export async function GET(req: NextRequest) {
  try {
    // Verify API key
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== PLATFORM_API_KEY) {
      return unauthorized('Invalid or missing API key')
    }

    // Get tenant_id from query params
    const { searchParams } = req.nextUrl
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      return badRequest('Missing tenant_id parameter')
    }

    // Get subscription for this tenant on Turnflow app
    const [sub] = await db
      .select({
        id: platformSchema.subscriptions.id,
        planId: platformSchema.subscriptions.planId,
        status: platformSchema.subscriptions.status,
        currentPeriodEnd: platformSchema.subscriptions.currentPeriodEnd,
        seats: platformSchema.subscriptions.seats,
      })
      .from(platformSchema.subscriptions)
      .where(
        and(
          eq(platformSchema.subscriptions.tenantId, tenantId),
          eq(platformSchema.subscriptions.appId, 'turnflow')
        )
      )
      .limit(1)

    if (!sub) {
      return notFound('No subscription found for this tenant')
    }

    // Get plan details
    const [plan] = await db
      .select({
        id: platformSchema.appPlans.id,
        slug: platformSchema.appPlans.slug,
        name: platformSchema.appPlans.name,
        features: platformSchema.appPlans.features,
      })
      .from(platformSchema.appPlans)
      .where(eq(platformSchema.appPlans.id, sub.planId))
      .limit(1)

    if (!plan) {
      return serverError('Plan not found')
    }

    // Get enabled modules for this subscription
    const modules = await db
      .select({
        slug: platformSchema.platformModules.slug,
        name: platformSchema.platformModules.name,
        isEnabled: platformSchema.tenantModuleAccess.isEnabled,
      })
      .from(platformSchema.platformModules)
      .leftJoin(
        platformSchema.tenantModuleAccess,
        and(
          eq(platformSchema.tenantModuleAccess.tenantId, tenantId),
          eq(platformSchema.tenantModuleAccess.moduleId, platformSchema.platformModules.id)
        )
      )
      .where(eq(platformSchema.platformModules.appId, 'turnflow'))

    // Map module slugs to enabled/disabled
    const activeModules = Object.fromEntries(
      modules.map(m => [m.slug, m.isEnabled ?? true])
    )

    return ok({
      subscription: {
        id: sub.id,
        active_modules: activeModules,
        status: sub.status,
        period_end: sub.currentPeriodEnd,
        seats: sub.seats,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        features: plan.features || [],
      },
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return serverError('Failed to fetch subscription')
  }
}
