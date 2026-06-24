import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, notFound, serverError } from '@lynkko/utils'
import { sendWebhookAsync } from '@/lib/webhooks'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenant_id, app_id, plan_id, seats } = body

    // Validate required fields
    if (!tenant_id || !app_id || !plan_id) {
      return badRequest('Missing required fields: tenant_id, app_id, plan_id')
    }

    // Get plan details
    const [plan] = await db
      .select()
      .from(platformSchema.appPlans)
      .where(eq(platformSchema.appPlans.id, plan_id))
      .limit(1)

    if (!plan) {
      return notFound('Plan not found')
    }

    // Check if subscription already exists
    const [existing] = await db
      .select()
      .from(platformSchema.subscriptions)
      .where(
        and(
          eq(platformSchema.subscriptions.tenantId, tenant_id),
          eq(platformSchema.subscriptions.appId, app_id)
        )
      )
      .limit(1)

    // Create or update subscription
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const subData = {
      tenantId: tenant_id,
      appId: app_id,
      planId: plan_id,
      status: 'active' as const,
      seats: seats ?? 1,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      updatedAt: new Date(),
    }

    let subscription
    if (existing) {
      await db
        .update(platformSchema.subscriptions)
        .set(subData)
        .where(eq(platformSchema.subscriptions.id, existing.id))
      subscription = { id: existing.id, ...subData }
    } else {
      const [created] = await db
        .insert(platformSchema.subscriptions)
        .values(subData)
        .returning()
      subscription = created
    }

    // Get tenant info + active modules for this plan
    const [modules, tenant] = await Promise.all([
      db
        .select({ slug: platformSchema.platformModules.slug })
        .from(platformSchema.platformModules)
        .where(eq(platformSchema.platformModules.appId, app_id)),
      db
        .select()
        .from(platformSchema.tenants)
        .where(eq(platformSchema.tenants.id, tenant_id))
        .limit(1)
        .then(r => r[0] ?? null),
    ])

    const planFeatures = (plan.features as string[] | null) ?? []
    const activeModules = Object.fromEntries(
      modules.map(m => [m.slug, planFeatures.includes(m.slug)])
    )

    // Send webhook to app if subscription was created or plan changed
    if (app_id === 'turnflow') {
      const eventType = existing && existing.planId !== plan_id ? 'plan_changed' : 'subscription_activated'
      sendWebhookAsync({
        event: eventType,
        tenant_id,
        tenant_name:  tenant?.name,
        tenant_slug:  tenant?.slug,
        tenant_email: tenant?.contactEmail ?? undefined,
        subscription_id: subscription.id,
        plan: { id: plan.id, name: plan.name, slug: plan.slug },
        active_modules: activeModules,
        period_end: periodEnd.toISOString(),
      })
    }

    return ok({
      subscription: {
        id: subscription.id,
        tenant_id,
        app_id,
        plan_id: plan.id,
        status: subscription.status,
        seats: subscription.seats,
        current_period_end: periodEnd,
      },
      webhook_sent: app_id === 'turnflow',
    })
  } catch (error) {
    console.error('Subscription creation error:', error)
    return serverError('Failed to create subscription')
  }
}
