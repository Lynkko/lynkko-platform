/**
 * POST /api/v1/billing/portal-session?tenant_id=<id>
 * La app (con su API key) pide un enlace al portal de cobro para un tenant.
 * Devuelve { url } con un token de sesión firmado y corto (30 min).
 */
import { ok } from '@lynkko/utils'
import { resolveV1Context } from '@/lib/api-v1'
import { signSession } from '@/lib/billing-portal'
import type { NextRequest } from 'next/server'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://platform.lynkko.co').trim().replace(/\/+$/, '')

export async function POST(req: NextRequest) {
  const resolved = await resolveV1Context(req)
  if ('response' in resolved) return resolved.response
  const { tenantId } = resolved.context

  const token = signSession(tenantId)
  return ok({ url: `${APP_URL}/billing?session=${encodeURIComponent(token)}` })
}
