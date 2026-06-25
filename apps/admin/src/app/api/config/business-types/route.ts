import { db, platformSchema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, unauthorized, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY!

/**
 * GET /api/config/business-types
 * Returns the list of business types configured for the ecosystem.
 * Used by Turnflow and other apps to populate their dropdowns.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token || token !== PLATFORM_API_KEY) {
      return unauthorized('Invalid or missing API key')
    }

    const [row] = await db
      .select()
      .from(platformSchema.platformSettings)
      .where(eq(platformSchema.platformSettings.key, 'business_types'))
      .limit(1)

    const businessTypes = (row?.value ?? []) as { slug: string; label: string }[]

    return ok({ business_types: businessTypes })
  } catch (error) {
    console.error('Error fetching business types:', error)
    return serverError('Failed to fetch business types')
  }
}
