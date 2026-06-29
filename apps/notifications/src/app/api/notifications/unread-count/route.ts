import { ok, badRequest, serverError } from '@lynkko/utils'
import { notif } from '@/lib/db'
import { requireServiceKey } from '@/lib/guard'
import type { NextRequest } from 'next/server'

/** GET /api/notifications/unread-count?userId=&tenantId= */
export async function GET(req: NextRequest) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  const sp = req.nextUrl.searchParams
  const userId = sp.get('userId')
  const tenantId = sp.get('tenantId')
  if (!userId || !tenantId) return badRequest('Missing userId or tenantId')

  try {
    const count = await notif.countUnread(userId, tenantId)
    return ok({ count })
  } catch (error) {
    console.error('[notifications unread-count]', error)
    return serverError('Failed to count unread')
  }
}
