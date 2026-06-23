import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, notFound, serverError } from '@lynkko/utils'
import { sendWebhookAsync } from '@/lib/webhooks'
import type { NextRequest } from 'next/server'

interface Params {
  params: Promise<{ subscriptionId: string }>
}

/**
 * PUT /api/subscriptions/{subscriptionId}
 * Update subscription (plan, seats, etc)
 * Body: { plan_id?: string, seats?: number }
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { subscriptionId } = await params
    const body = await req.json()
    const { plan_id, seats } = body

    // Get current subscription
    const [current] = await db
      .select()
      .from(platformSchema.subscriptions)
      .innerJoin(
        platformSchema.appPlans,
        eq(platformSchema.subscriptions.planId, platformSchema.appPlans.id)
      )
      .where(eq(platformSchema.subscriptions.id, subscriptionId))
      .limit(1)

    if (!current) {
      return notFound('Subscription not found')
    }

    const subscription = current.subscriptions
    const oldPlan = current.app_plans

    if (!plan_id && !seats) {
      return badRequest('Must provide plan_id or seats to update')
    }

    // If changing plan, verify new plan exists and is for same app
    let newPlan = oldPlan
    if (plan_id && plan_id !== subscription.planId) {
      const [planToUse] = await db
        .select()
        .from(platformSchema.appPlans)
        .where(
          and(
            eq(platformSchema.appPlans.id, plan_id),
            eq(platformSchema.appPlans.appId, subscription.appId)
          )
        )
        .limit(1)

      if (!planToUse) {
        return notFound('Plan not found or not for this app')
      }

      newPlan = planToUse
    }

    // Update subscription
    const updateData: any = {}
    let planChanged = false

    if (plan_id && plan_id !== subscription.planId) {
      updateData.planId = plan_id
      planChanged = true
    }

    if (seats !== undefined && seats !== subscription.seats) {
      updateData.seats = seats
    }

    if (Object.keys(updateData).length === 0) {
      return badRequest('No changes to apply')
    }

    await db
      .update(platformSchema.subscriptions)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(platformSchema.subscriptions.id, subscriptionId))

    // Get active modules for webhook
    const modules = await db
      .select({
        id: platformSchema.platformModules.id,
        slug: platformSchema.platformModules.slug,
      })
      .from(platformSchema.platformModules)
      .where(eq(platformSchema.platformModules.appId, subscription.appId))

    const activeModules: Record<string, boolean> = {}
    for (const module of modules) {
      const [access] = await db
        .select({
          isEnabled: platformSchema.tenantModuleAccess.isEnabled,
        })
        .from(platformSchema.tenantModuleAccess)
        .where(
          and(
            eq(platformSchema.tenantModuleAccess.tenantId, subscription.tenantId),
            eq(platformSchema.tenantModuleAccess.moduleId, module.id)
          )
        )
        .limit(1)

      activeModules[module.slug] = access?.isEnabled ?? true
    }

    // Send webhook
    const eventType = planChanged ? 'plan_changed' : 'subscription_updated'
    sendWebhookAsync({
      event: eventType as any,
      tenant_id: subscription.tenantId,
      subscription_id: subscription.id,
      plan: {
        id: newPlan.id,
        name: newPlan.name,
        slug: newPlan.slug,
      },
      active_modules: activeModules,
      period_end: subscription.currentPeriodEnd.toISOString(),
    })

    return ok({
      status: 'updated',
      subscription_id: subscriptionId,
      changes: {
        plan: planChanged ? { from: oldPlan.slug, to: newPlan.slug } : null,
        seats: seats !== undefined ? { from: subscription.seats, to: seats } : null,
      },
      webhook_sent: true,
    })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return serverError('Failed to update subscription')
  }
}
