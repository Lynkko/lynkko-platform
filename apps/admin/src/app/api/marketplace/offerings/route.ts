import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, unauthorized, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY!

/**
 * GET /api/marketplace/offerings?host_app_id=turnflow
 *
 * Returns apps configured as offerings in a given host app's marketplace.
 * Used by Turnflow (and other apps) to populate their marketplace with
 * cross-app integrations configured in the platform admin.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token || token !== PLATFORM_API_KEY) {
      return unauthorized('Invalid or missing API key')
    }

    const hostAppId = req.nextUrl.searchParams.get('host_app_id')
    if (!hostAppId) {
      return ok({ offerings: [] })
    }

    const rows = await db
      .select({
        id:          platformSchema.appMarketplaceOfferings.id,
        isEnabled:   platformSchema.appMarketplaceOfferings.isEnabled,
        sortOrder:   platformSchema.appMarketplaceOfferings.sortOrder,
        guestAppId:  platformSchema.appMarketplaceOfferings.guestAppId,
        guestName:   platformSchema.platformApps.name,
        guestDesc:   platformSchema.platformApps.description,
        guestUrl:    platformSchema.platformApps.url,
        guestActive: platformSchema.platformApps.isActive,
      })
      .from(platformSchema.appMarketplaceOfferings)
      .innerJoin(
        platformSchema.platformApps,
        eq(platformSchema.appMarketplaceOfferings.guestAppId, platformSchema.platformApps.id),
      )
      .where(
        and(
          eq(platformSchema.appMarketplaceOfferings.hostAppId, hostAppId),
          eq(platformSchema.appMarketplaceOfferings.isEnabled, true),
          eq(platformSchema.platformApps.isActive, true),
        ),
      )
      .orderBy(platformSchema.appMarketplaceOfferings.sortOrder)

    return ok({
      host_app_id: hostAppId,
      offerings: rows.map(r => ({
        id:          r.guestAppId,
        name:        r.guestName,
        description: r.guestDesc,
        url:         r.guestUrl,
        sort_order:  r.sortOrder,
      })),
    })
  } catch (error) {
    console.error('Error fetching marketplace offerings:', error)
    return serverError('Failed to fetch marketplace offerings')
  }
}
