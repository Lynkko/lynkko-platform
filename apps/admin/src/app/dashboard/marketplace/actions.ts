'use server'

import { revalidatePath } from 'next/cache'
import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireSuperadmin } from '@/lib/session'

export async function toggleOfferingAction(hostAppId: string, guestAppId: string, isEnabled: boolean) {
  await requireSuperadmin()
  await db.insert(platformSchema.appMarketplaceOfferings)
    .values({ hostAppId, guestAppId, isEnabled })
    .onConflictDoUpdate({
      target: [platformSchema.appMarketplaceOfferings.hostAppId, platformSchema.appMarketplaceOfferings.guestAppId],
      set: { isEnabled, updatedAt: new Date() },
    })
  revalidatePath('/dashboard/marketplace')
}
