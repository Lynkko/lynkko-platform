import { ok, badRequest, serverError } from '@lynkko/utils'
import { requireServiceKey } from '@/lib/guard'
import { handleSend } from '@/lib/send'
import type { NextRequest } from 'next/server'

/**
 * POST /api/send — envío unificado.
 * body email: { tenantId, appId, channel:'email', to, subject, html? | title/content, ctaText?, ctaUrl?, idempotencyKey? }
 * body push:  { tenantId, appId, channel:'push', subscriptions[], title, body, url?, idempotencyKey? }
 */
export async function POST(req: NextRequest) {
  const denied = requireServiceKey(req)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  try {
    const result = await handleSend(body as Record<string, unknown>)
    return ok(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'send failed'
    // Errores de validación → 400; el resto → 500.
    if (/Missing|requires|Unsupported/.test(msg)) return badRequest(msg)
    console.error('[comms send]', error)
    return serverError('Failed to send')
  }
}
