import { db, platformSchema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, badRequest, unauthorized, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY!

/**
 * POST /api/apps/turnflow/register-tenant
 *
 * Llamado por Turnflow cuando una brand se registra directamente en Turnflow
 * (no desde platform). Crea o vincula el tenant en platform sin disparar webhooks,
 * para que pueda ser administrado desde platform sin romper la config existente.
 *
 * Body: { brand_id, brand_name, brand_slug, contact_email?, brand_created_at? }
 * Returns: { tenant_id, action: 'created' | 'linked' }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token || token !== PLATFORM_API_KEY) {
      return unauthorized('Invalid or missing API key')
    }

    const body = await req.json()
    const { brand_id, brand_name, brand_slug, contact_email } = body

    if (!brand_id || !brand_name || !brand_slug) {
      return badRequest('Missing required fields: brand_id, brand_name, brand_slug')
    }

    // Buscar tenant existente por slug
    const [existing] = await db
      .select({ id: platformSchema.tenants.id })
      .from(platformSchema.tenants)
      .where(eq(platformSchema.tenants.slug, brand_slug))
      .limit(1)

    let tenantId: string
    let action: 'created' | 'linked'

    if (existing) {
      tenantId = existing.id
      action = 'linked'
    } else {
      const [created] = await db
        .insert(platformSchema.tenants)
        .values({
          name:         brand_name,
          slug:         brand_slug,
          contactEmail: contact_email ?? null,
          status:       'active',
          notes:        `Registrado desde Turnflow (brand_id: ${brand_id})`,
        })
        .returning({ id: platformSchema.tenants.id })

      tenantId = created.id
      action = 'created'
    }

    // Marcar Turnflow como habilitado para este tenant (sin webhook)
    await db
      .insert(platformSchema.tenantAppAccess)
      .values({
        tenantId,
        appId:     'turnflow',
        isEnabled: true,
        enabledAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [platformSchema.tenantAppAccess.tenantId, platformSchema.tenantAppAccess.appId],
        set:    { isEnabled: true, updatedAt: new Date() },
      })

    return ok({ tenant_id: tenantId, action })
  } catch (error) {
    console.error('register-tenant error:', error)
    return serverError('Failed to register tenant')
  }
}
