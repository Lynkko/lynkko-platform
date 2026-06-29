import { ok, badRequest, serverError } from '@lynkko/utils'
import { audit } from '@/lib/db'
import { requireServiceKey } from '@/lib/guard'
import type { NextRequest } from 'next/server'

/** POST /api/audit/purge  body: { olderThan: ISO string } */
export async function POST(req: NextRequest) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  let body: { olderThan?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }
  if (!body.olderThan) return badRequest('Missing olderThan')

  try {
    const deleted = await audit.purge(new Date(body.olderThan))
    return ok({ deleted })
  } catch (error) {
    console.error('[audit purge]', error)
    return serverError('Failed to purge audit logs')
  }
}
