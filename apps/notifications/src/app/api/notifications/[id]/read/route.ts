import { ok, badRequest, serverError } from '@lynkko/utils'
import { notif } from '@/lib/db'
import { requireServiceKey } from '@/lib/guard'
import type { NextRequest } from 'next/server'

/** POST /api/notifications/:id/read  body: { userId } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  const { id } = await params
  let body: { userId?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }
  if (!body.userId) return badRequest('Missing userId')

  try {
    await notif.markRead(id, body.userId)
    return ok({ status: 'ok' })
  } catch (error) {
    console.error('[notifications read]', error)
    return serverError('Failed to mark as read')
  }
}
