import { ok, badRequest, serverError } from '@lynkko/utils'
import { notif } from '@/lib/db'
import { requireServiceKey } from '@/lib/guard'
import type { NextRequest } from 'next/server'

/** POST /api/notifications/read-all  body: { userId, tenantId } */
export async function POST(req: NextRequest) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  let body: { userId?: string; tenantId?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }
  if (!body.userId || !body.tenantId) return badRequest('Missing userId or tenantId')

  try {
    await notif.markAllRead(body.userId, body.tenantId)
    return ok({ status: 'ok' })
  } catch (error) {
    console.error('[notifications read-all]', error)
    return serverError('Failed to mark all as read')
  }
}
