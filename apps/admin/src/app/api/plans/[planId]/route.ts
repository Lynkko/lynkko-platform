import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, notFound, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

interface Params {
  params: Promise<{ planId: string }>
}

/**
 * GET /api/plans/{planId}
 * Get a specific plan
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { planId } = await params

    const [plan] = await db
      .select()
      .from(platformSchema.appPlans)
      .where(eq(platformSchema.appPlans.id, planId))
      .limit(1)

    if (!plan) {
      return notFound('Plan not found')
    }

    return ok({ plan })
  } catch (error) {
    console.error('Error fetching plan:', error)
    return serverError('Failed to fetch plan')
  }
}

/**
 * PUT /api/plans/{planId}
 * Update a plan
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { planId } = await params
    const body = await req.json()

    const {
      slug,
      name,
      description,
      monthly_price,
      annual_price,
      currency,
      max_seats,
      features,
      is_public,
      sort_order,
      is_active,
    } = body

    // Get current plan
    const [currentPlan] = await db
      .select()
      .from(platformSchema.appPlans)
      .where(eq(platformSchema.appPlans.id, planId))
      .limit(1)

    if (!currentPlan) {
      return notFound('Plan not found')
    }

    // If slug is being changed, check for duplicates in same app
    if (slug && slug !== currentPlan.slug) {
      const [existing] = await db
        .select()
        .from(platformSchema.appPlans)
        .where(
          and(
            eq(platformSchema.appPlans.appId, currentPlan.appId),
            eq(platformSchema.appPlans.slug, slug)
          )
        )
        .limit(1)

      if (existing) {
        return badRequest(`Plan with slug "${slug}" already exists for this app`)
      }
    }

    // Update plan
    const updateData: Partial<typeof currentPlan> = {}
    if (slug !== undefined) updateData.slug = slug
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description || null
    if (monthly_price !== undefined) updateData.monthlyPrice = monthly_price
    if (annual_price !== undefined) updateData.annualPrice = annual_price
    if (currency !== undefined) updateData.currency = currency
    if (max_seats !== undefined) updateData.maxSeats = max_seats || null
    if (features !== undefined) updateData.features = features || null
    if (is_public !== undefined) updateData.isPublic = is_public
    if (sort_order !== undefined) updateData.sortOrder = sort_order
    if (is_active !== undefined) updateData.isActive = is_active
    if (Object.keys(updateData).length === 0) {
      return badRequest('No fields to update')
    }

    await db
      .update(platformSchema.appPlans)
      .set(updateData)
      .where(eq(platformSchema.appPlans.id, planId))

    // Fetch updated plan
    const [updatedPlan] = await db
      .select()
      .from(platformSchema.appPlans)
      .where(eq(platformSchema.appPlans.id, planId))
      .limit(1)

    return ok({
      status: 'updated',
      plan: updatedPlan,
    })
  } catch (error) {
    console.error('Error updating plan:', error)
    return serverError('Failed to update plan')
  }
}

/**
 * DELETE /api/plans/{planId}
 * Delete a plan (soft delete if subscriptions exist, otherwise hard delete)
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { planId } = await params

    // Get plan
    const [plan] = await db
      .select()
      .from(platformSchema.appPlans)
      .where(eq(platformSchema.appPlans.id, planId))
      .limit(1)

    if (!plan) {
      return notFound('Plan not found')
    }

    // Check if any subscriptions use this plan
    const [subscription] = await db
      .select()
      .from(platformSchema.subscriptions)
      .where(eq(platformSchema.subscriptions.planId, planId))
      .limit(1)

    if (subscription) {
      // Soft delete: just mark as inactive
      await db
        .update(platformSchema.appPlans)
        .set({ isActive: false })
        .where(eq(platformSchema.appPlans.id, planId))

      return ok({
        status: 'soft_deleted',
        reason: 'Plan has active subscriptions. Marked as inactive.',
        plan_id: planId,
      })
    }

    // Hard delete if no subscriptions
    await db
      .delete(platformSchema.appPlans)
      .where(eq(platformSchema.appPlans.id, planId))

    return ok({
      status: 'deleted',
      plan_id: planId,
    })
  } catch (error) {
    console.error('Error deleting plan:', error)
    return serverError('Failed to delete plan')
  }
}
