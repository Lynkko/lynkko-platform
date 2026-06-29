import { ok, created, badRequest, serverError } from '@lynkko/utils'
import { audit } from '@/lib/db'
import { requireServiceKey } from '@/lib/guard'
import type { NextRequest } from 'next/server'

/** GET /api/audit?tenantId=&userId=&action=&resource=&resourceId=&from=&to=&limit=&offset= */
export async function GET(req: NextRequest) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  const sp = req.nextUrl.searchParams
  const tenantId = sp.get('tenantId')
  if (!tenantId) return badRequest('Missing tenantId')

  try {
    const items = await audit.query({
      tenantId,
      userId:     sp.get('userId')     ?? undefined,
      action:     sp.get('action')     ?? undefined,
      resource:   sp.get('resource')   ?? undefined,
      resourceId: sp.get('resourceId') ?? undefined,
      from:       sp.get('from')       ?? undefined,
      to:         sp.get('to')         ?? undefined,
      limit:  sp.get('limit')  ? Number(sp.get('limit'))  : undefined,
      offset: sp.get('offset') ? Number(sp.get('offset')) : undefined,
    })
    return ok({ items })
  } catch (error) {
    console.error('[audit GET]', error)
    return serverError('Failed to query audit logs')
  }
}

/** POST /api/audit  body: AuditEntry */
export async function POST(req: NextRequest) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  let body: { tenantId?: string; action?: string; resource?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }
  if (!body.tenantId || !body.action || !body.resource) {
    return badRequest('Missing required fields: tenantId, action, resource')
  }

  try {
    const entry = await audit.log(body as Parameters<typeof audit.log>[0])
    return created(entry)
  } catch (error) {
    console.error('[audit POST]', error)
    return serverError('Failed to write audit log')
  }
}
