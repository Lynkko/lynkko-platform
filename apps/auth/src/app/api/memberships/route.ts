import { and, eq } from 'drizzle-orm'
import { ok, badRequest } from '@lynkko/utils'
import { membership } from '@lynkko/auth'
import { db } from '@/lib/db'
import { requireServiceKey } from '@/lib/guard'
import type { NextRequest } from 'next/server'

/**
 * GET /api/memberships?userId=  → membresías de una identidad global.
 * Las apps la consultan para resolver la AUTORIZACIÓN local (app + tenant + rol).
 */
export async function GET(req: NextRequest) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return badRequest('Missing userId')

  const rows = await db
    .select()
    .from(membership)
    .where(eq(membership.userId, userId))

  return ok({ memberships: rows })
}

/**
 * POST /api/memberships  body: { userId, appId, tenantId, role? }
 * Upsert por (userId, appId, tenantId).
 */
export async function POST(req: NextRequest) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  let body: { userId?: string; appId?: string; tenantId?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const { userId, appId, tenantId, role } = body
  if (!userId || !appId || !tenantId) {
    return badRequest('Missing userId, appId or tenantId')
  }

  const [existing] = await db
    .select()
    .from(membership)
    .where(
      and(
        eq(membership.userId, userId),
        eq(membership.appId, appId),
        eq(membership.tenantId, tenantId),
      ),
    )
    .limit(1)

  if (existing) {
    await db
      .update(membership)
      .set({ role: role ?? existing.role, updatedAt: new Date() })
      .where(eq(membership.id, existing.id))
    return ok({ id: existing.id, updated: true })
  }

  const id = crypto.randomUUID()
  await db.insert(membership).values({
    id,
    userId,
    appId,
    tenantId,
    role: role ?? 'member',
  })
  return ok({ id, created: true })
}
