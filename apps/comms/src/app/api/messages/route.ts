import { and, desc, eq } from 'drizzle-orm'
import { ok, badRequest } from '@lynkko/utils'
import { messages } from '@lynkko/comms'
import { db } from '@/lib/db'
import { requireServiceKey } from '@/lib/guard'
import type { NextRequest } from 'next/server'

/** GET /api/messages?tenantId=&channel=&status=&limit=&offset= — log de entregas. */
export async function GET(req: NextRequest) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  const sp = req.nextUrl.searchParams
  const tenantId = sp.get('tenantId')
  if (!tenantId) return badRequest('Missing tenantId')

  const conditions = [eq(messages.tenantId, tenantId)]
  const channel = sp.get('channel')
  const status = sp.get('status')
  if (channel) conditions.push(eq(messages.channel, channel))
  if (status) conditions.push(eq(messages.status, status))

  const limit = Math.min(Number(sp.get('limit')) || 50, 200)
  const offset = Number(sp.get('offset')) || 0

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset)

  return ok({ messages: rows })
}
