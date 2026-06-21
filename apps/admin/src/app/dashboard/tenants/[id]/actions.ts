'use server'

import { revalidatePath } from 'next/cache'
import { platform } from '@/lib/platform'
import { requireSuperadmin } from '@/lib/session'
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
  await platform.createSubscription(tenantId, appId, planId, { seats })
  await platform.enableApp(tenantId, appId)
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
