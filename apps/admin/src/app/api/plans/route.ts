import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, notFound, unauthorized, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

/**
 * GET /api/plans
 * List all plans, optionally filtered by app_id
 * Query params: ?app_id=turnflow
 */
const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY!

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token || token !== PLATFORM_API_KEY) {
      return unauthorized('Invalid or missing API key')
    }

    const { searchParams } = req.nextUrl
    const appId = searchParams.get('app_id')

    const plans = await db
      .select()
      .from(platformSchema.appPlans)
      .where(appId ? eq(platformSchema.appPlans.appId, appId) : undefined)
      .orderBy(platformSchema.appPlans.sortOrder)

    return ok({
      plans,
      total: plans.length,
      filtered_by_app: appId ?? null,
    })
  } catch (error) {
    console.error('Error fetching plans:', error)
    return serverError('Failed to fetch plans')
  }
}

/**
 * POST /api/plans
 * Create a new plan
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      app_id,
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

    // Validate required fields
    if (!app_id || !slug || !name) {
      return badRequest('Missing required fields: app_id, slug, name')
    }

    // Verify app exists
    const [app] = await db
      .select()
      .from(platformSchema.platformApps)
      .where(eq(platformSchema.platformApps.id, app_id))
      .limit(1)

    if (!app) {
      return notFound('App not found')
    }

    // Check if plan with same slug already exists for this app
    const [existing] = await db
      .select()
      .from(platformSchema.appPlans)
      .where(
        and(
          eq(platformSchema.appPlans.appId, app_id),
          eq(platformSchema.appPlans.slug, slug)
        )
      )
      .limit(1)

    if (existing) {
      return badRequest(`Plan with slug "${slug}" already exists for this app`)
    }

    // Create plan
    const [plan] = await db
      .insert(platformSchema.appPlans)
      .values({
        appId: app_id,
        slug,
        name,
        description: description || null,
        monthlyPrice: monthly_price ?? 0,
        annualPrice: annual_price ?? 0,
        currency: currency ?? 'COP',
        maxSeats: max_seats || null,
        features: features || null,
        isPublic: is_public ?? true,
        sortOrder: sort_order ?? 0,
        isActive: is_active ?? true,
      })
      .returning()

    return ok({
      status: 'created',
      plan,
    })
  } catch (error) {
    console.error('Error creating plan:', error)
    return serverError('Failed to create plan')
  }
}
