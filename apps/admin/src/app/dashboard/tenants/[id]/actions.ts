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
