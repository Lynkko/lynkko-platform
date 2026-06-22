import { ok, serverError } from '@lynkko/utils'
import { getAuditSummary } from '@/lib/audit-log'
import type { NextRequest } from 'next/server'

/**
 * GET /api/audit-logs/summary
 * Get audit summary/statistics for a period
 * Query: ?days=7 (default: 7)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const days = parseInt(searchParams.get('days') ?? '7')

    if (days < 1 || days > 365) {
      return ok({
        error: 'Invalid days parameter. Must be between 1 and 365.',
        status: 400,
      })
    }

    const summary = await getAuditSummary(days)

    return ok({
      summary,
      period_days: days,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching audit summary:', error)
    return serverError('Failed to fetch audit summary')
  }
}
