import { db, platformSchema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, badRequest, notFound, serverError } from '@lynkko/utils'
import { sendWebhookAsync } from '@/lib/webhooks'
import type { NextRequest } from 'next/server'

interface Params {
  params: Promise<{ subscriptionId: string }>
}

/**
 * POST /api/subscriptions/{subscriptionId}/cancel
 * Cancel a subscription immediately
 * Body: { reason?: string, immediate?: boolean }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { subscriptionId } = await params
    const body = await req.json()
    const { reason, immediate } = body

    // Get subscription
    const [sub] = await db
      .select()
      .from(platformSchema.subscriptions)
      .innerJoin(
        platformSchema.appPlans,
        eq(platformSchema.subscriptions.planId, platformSchema.appPlans.id)
      )
      .where(eq(platformSchema.subscriptions.id, subscriptionId))
      .limit(1)

    if (!sub) {
      return notFound('Subscription not found')
    }

    const subscription = sub.subscriptions
    const plan = sub.app_plans

    // Check if already canceled
    if (subscription.status === 'canceled') {
      return badRequest('Subscription is already canceled')
    }

    // Update subscription
    const canceledAt = immediate ? new Date() : null
    const newStatus = immediate ? 'canceled' : 'canceled'

    await db
      .update(platformSchema.subscriptions)
      .set({
        status: newStatus,
        canceledAt: canceledAt,
        cancelAtPeriodEnd: !immediate, // If not immediate, cancel at end of period
      })
      .where(eq(platformSchema.subscriptions.id, subscriptionId))

    // Send webhook to app
    sendWebhookAsync({
      event: 'subscription_canceled',
      tenant_id: subscription.tenantId,
      subscription_id: subscription.id,
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
      },
      period_end: subscription.currentPeriodEnd.toISOString(),
    })

    return ok({
      status: 'canceled',
      subscription_id: subscriptionId,
      tenant_id: subscription.tenantId,
      app_id: subscription.appId,
      canceled_at: canceledAt,
      reason: reason || 'No reason provided',
      immediate,
      webhook_sent: true,
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return serverError('Failed to cancel subscription')
  }
}
