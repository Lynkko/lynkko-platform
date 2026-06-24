'use server'

import { revalidatePath } from 'next/cache'
import { platform } from '@/lib/platform'
import { requireSuperadmin } from '@/lib/session'
import { sendWebhookAsync } from '@/lib/webhooks'
import { db, platformSchema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import type { LynkkoAppId } from '@lynkko/platform'

export async function toggleTenantApp(tenantId: string, appId: LynkkoAppId, enable: boolean) {
  await requireSuperadmin()
  if (enable) {
    await platform.enableApp(tenantId, appId)
  } else {
    await platform.disableApp(tenantId, appId)
  }
  revalidatePath(`/dashboard/tenants/${tenantId}`)
}

export async function addSubscriptionAction(
  tenantId: string,
  appId: LynkkoAppId,
  planId: string,
  seats: number,
) {
  await requireSuperadmin()

  const [sub, tenant, plan] = await Promise.all([
    platform.createSubscription(tenantId, appId, planId, { seats }),
    platform.getTenant(tenantId),
    db.select().from(platformSchema.appPlans).where(eq(platformSchema.appPlans.id, planId)).limit(1).then(r => r[0]),
  ])

  await platform.enableApp(tenantId, appId)

  if (appId === 'turnflow' && tenant && plan) {
    const modules = await db
      .select({ slug: platformSchema.platformModules.slug })
      .from(platformSchema.platformModules)
      .where(eq(platformSchema.platformModules.appId, appId))

    const planFeatures = (plan.features as string[] | null) ?? []
    const activeModules = Object.fromEntries(
      modules.map(m => [m.slug, planFeatures.includes(m.slug)])
    )

    const periodEnd = new Date(sub.currentPeriodEnd)

    sendWebhookAsync({
      event: 'subscription_activated',
      tenant_id:    tenantId,
      tenant_name:  tenant.name,
      tenant_slug:  tenant.slug,
      tenant_email: tenant.contactEmail ?? undefined,
      subscription_id: sub.id,
      plan: { id: plan.id, name: plan.name, slug: plan.slug },
      active_modules: activeModules,
      period_end: periodEnd.toISOString(),
    })
  }

  revalidatePath(`/dashboard/tenants/${tenantId}`)
}

export async function cancelSubscriptionAction(tenantId: string, subscriptionId: string) {
  await requireSuperadmin()
  await platform.cancelSubscription(subscriptionId)
  revalidatePath(`/dashboard/tenants/${tenantId}`)
}

export async function updateTenantAction(id: string, formData: FormData) {
  await requireSuperadmin()
  const name         = formData.get('name') as string
  const contactEmail = formData.get('contactEmail') as string | null
  const contactPhone = formData.get('contactPhone') as string | null
  const country      = formData.get('country') as string | null
  const status       = formData.get('status') as 'trial' | 'active' | 'suspended' | 'churned'
  const notes        = formData.get('notes') as string | null

  await platform.updateTenant(id, {
    name:         name?.trim(),
    contactEmail: contactEmail?.trim() || undefined,
    contactPhone: contactPhone?.trim() || undefined,
    country:      country?.trim()      || undefined,
    status,
    notes:        notes?.trim()        || undefined,
  })
  revalidatePath(`/dashboard/tenants/${id}`)
}

export async function updateThemeAction(tenantId: string, appId: LynkkoAppId, formData: FormData) {
  await requireSuperadmin()
  const primary      = formData.get('primary') as string
  const appName      = formData.get('appName') as string | null
  const logoUrl      = formData.get('logoUrl') as string | null
  const borderRadius = formData.get('borderRadius') as 'none' | 'sm' | 'md' | 'lg' | 'full' | null

  await platform.updateTheme(tenantId, appId, {
    primary,
    appName:      appName?.trim()      || undefined,
    logoUrl:      logoUrl?.trim()      || undefined,
    borderRadius: borderRadius         || undefined,
  })
  revalidatePath(`/dashboard/tenants/${tenantId}`)
}
