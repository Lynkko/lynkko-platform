import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, unauthorized, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY!
const FREE_PLAN_ID = 'plan_turnflow_free'

/**
 * POST /api/apps/turnflow/register-tenant
 *
 * Llamado por Turnflow cuando una brand se registra directamente (no desde platform).
 * Crea o vincula el tenant en platform, asigna plan gratuito si no tiene suscripción,
 * y NO dispara webhooks para no sobreescribir la config existente.
 *
 * Body: { brand_id, brand_name, brand_slug, contact_name?, contact_email?, contact_phone? }
 * Returns: { tenant_id, action, subscription_id?, plan_id?, period_end? }
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token || token !== PLATFORM_API_KEY) {
      return unauthorized('Invalid or missing API key')
    }

    const body = await req.json()
    const { brand_id, brand_name, brand_slug, contact_name, contact_email, contact_phone } = body

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
      // Actualizar datos de contacto si faltan
      if (contact_name || contact_email || contact_phone) {
        await db.update(platformSchema.tenants)
          .set({
            ...(contact_name  ? { contactName:  contact_name }  : {}),
            ...(contact_email ? { contactEmail: contact_email } : {}),
            ...(contact_phone ? { contactPhone: contact_phone } : {}),
            updatedAt: new Date(),
          })
          .where(eq(platformSchema.tenants.id, tenantId))
      }
    } else {
      const [created] = await db
        .insert(platformSchema.tenants)
        .values({
          name:         brand_name,
          slug:         brand_slug,
          contactName:  contact_name  ?? null,
          contactEmail: contact_email ?? null,
          contactPhone: contact_phone ?? null,
          status:       'active',
          notes:        `Registrado desde Turnflow (brand_id: ${brand_id})`,
        })
        .returning({ id: platformSchema.tenants.id })

      tenantId = created.id
      action = 'created'
    }

    // Marcar Turnflow como habilitado (sin webhook)
    await db
      .insert(platformSchema.tenantAppAccess)
      .values({ tenantId, appId: 'turnflow', isEnabled: true, enabledAt: new Date() })
      .onConflictDoUpdate({
        target: [platformSchema.tenantAppAccess.tenantId, platformSchema.tenantAppAccess.appId],
        set:    { isEnabled: true, updatedAt: new Date() },
      })

    // Verificar si ya tiene suscripción activa
    const [existingSub] = await db
      .select({ id: platformSchema.subscriptions.id, planId: platformSchema.subscriptions.planId, status: platformSchema.subscriptions.status })
      .from(platformSchema.subscriptions)
      .where(and(
        eq(platformSchema.subscriptions.tenantId, tenantId),
        eq(platformSchema.subscriptions.appId, 'turnflow'),
      ))
      .limit(1)

    if (existingSub) {
      return ok({ tenant_id: tenantId, action, subscription_id: existingSub.id, plan_id: existingSub.planId })
    }

    // Auto-asignar plan gratuito
    const periodEnd = new Date()
    periodEnd.setFullYear(periodEnd.getFullYear() + 10) // gratuito: sin vencimiento real

    const [sub] = await db
      .insert(platformSchema.subscriptions)
      .values({
        tenantId,
        appId:              'turnflow',
        planId:             FREE_PLAN_ID,
        status:             'active',
        seats:              1,
        currentPeriodStart: new Date(),
        currentPeriodEnd:   periodEnd,
      })
      .returning({ id: platformSchema.subscriptions.id, currentPeriodEnd: platformSchema.subscriptions.currentPeriodEnd })

    return ok({
      tenant_id:       tenantId,
      action,
      subscription_id: sub.id,
      plan_id:         FREE_PLAN_ID,
      period_end:      sub.currentPeriodEnd.toISOString(),
    })
  } catch (error) {
    console.error('register-tenant error:', error)
    return serverError('Failed to register tenant')
  }
}
