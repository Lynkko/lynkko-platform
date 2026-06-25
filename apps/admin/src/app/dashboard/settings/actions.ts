'use server'

import { revalidatePath } from 'next/cache'
import { db, platformSchema } from '@/lib/db'
import { requireSuperadmin } from '@/lib/session'

type BusinessType = { slug: string; label: string }

export async function saveBusinessTypesAction(types: BusinessType[]) {
  await requireSuperadmin()
  await db.insert(platformSchema.platformSettings)
    .values({ key: 'business_types', value: types })
    .onConflictDoUpdate({
      target: platformSchema.platformSettings.key,
      set: { value: types, updatedAt: new Date() },
    })
  revalidatePath('/dashboard/settings')
}
