import { ok, created, badRequest, serverError } from '@lynkko/utils'
import { notif } from '@/lib/db'
import { requireServiceKey } from '@/lib/guard'
import type { NextRequest } from 'next/server'

/** GET /api/notifications?userId=&tenantId=&unreadOnly=&limit=&offset= */
export async function GET(req: NextRequest) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  const sp = req.nextUrl.searchParams
  const userId = sp.get('userId')
  const tenantId = sp.get('tenantId')
  if (!userId || !tenantId) return badRequest('Missing userId or tenantId')

  try {
    const items = await notif.get(userId, tenantId, {
      unreadOnly: sp.get('unreadOnly') === 'true',
      limit:  sp.get('limit')  ? Number(sp.get('limit'))  : undefined,
      offset: sp.get('offset') ? Number(sp.get('offset')) : undefined,
    })
    return ok({ items })
  } catch (error) {
    console.error('[notifications GET]', error)
    return serverError('Failed to fetch notifications')
  }
}

/** POST /api/notifications  body: CreateNotificationInput */
export async function POST(req: NextRequest) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  let body: { tenantId?: string; userId?: string; title?: string; body?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }
  if (!body.tenantId || !body.userId || !body.title || !body.body) {
    return badRequest('Missing required fields: tenantId, userId, title, body')
  }

  try {
    const notification = await notif.create(body as Parameters<typeof notif.create>[0])
    return created(notification)
  } catch (error) {
    console.error('[notifications POST]', error)
    return serverError('Failed to create notification')
  }
}
