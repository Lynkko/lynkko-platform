'use server'

import { revalidatePath } from 'next/cache'
import { db, platformSchema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireSuperadmin } from '@/lib/session'

export async function toggleAppActiveAction(appId: string, isActive: boolean) {
  await requireSuperadmin()
  await db.update(platformSchema.platformApps)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(platformSchema.platformApps.id, appId))
  revalidatePath('/dashboard/apps')
  revalidatePath('/dashboard/marketplace')
}

export async function toggleAppMarketplaceAction(appId: string, showInMarketplace: boolean) {
  await requireSuperadmin()
  await db.update(platformSchema.platformApps)
    .set({ showInMarketplace, updatedAt: new Date() })
    .where(eq(platformSchema.platformApps.id, appId))
  revalidatePath('/dashboard/apps')
  revalidatePath('/dashboard/marketplace')
}
