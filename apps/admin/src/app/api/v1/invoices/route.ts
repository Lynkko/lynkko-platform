import { ok, serverError } from '@lynkko/utils'
import { platform } from '@/lib/platform'
import { resolveV1Context } from '@/lib/api-v1'
import type { NextRequest } from 'next/server'

/**
 * GET /api/v1/invoices?tenant_id=<id>
 * Facturas del tenant.
 */
export async function GET(req: NextRequest) {
  const resolved = await resolveV1Context(req)
  if ('response' in resolved) return resolved.response
  const { tenantId } = resolved.context

  try {
    const invoices = await platform.listInvoices(tenantId)
    return ok({ invoices })
  } catch (error) {
    console.error('[v1/invoices]', error)
    return serverError('Failed to fetch invoices')
  }
}
