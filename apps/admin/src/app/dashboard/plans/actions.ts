'use server'

import { revalidatePath } from 'next/cache'
import { platform } from '@/lib/platform'
import { requireSuperadmin } from '@/lib/session'

export async function createPlanAction(formData: FormData) {
  await requireSuperadmin()

  const appId        = formData.get('appId')        as string
  const name         = formData.get('name')         as string
  const slug         = formData.get('slug')         as string
  const description  = formData.get('description')  as string | null
  const currency     = formData.get('currency')     as string
  const monthlyPrice = Number(formData.get('monthlyPrice')) || 0
  const annualPrice  = Number(formData.get('annualPrice'))  || 0
  const maxSeats     = formData.get('maxSeats') ? Number(formData.get('maxSeats')) : undefined
  const sortOrder    = Number(formData.get('sortOrder')) || 0
  const featuresRaw  = formData.get('features') as string | null
  const isPublic     = formData.get('isPublic') === 'on'
  const isActive     = formData.get('isActive') === 'on'

  const features = featuresRaw
    ? featuresRaw.split('\n').map((f) => f.trim()).filter(Boolean)
    : undefined

  await platform.createPlan({
    appId,
    name:        name.trim(),
    slug:        slug.trim(),
    description: description?.trim() || undefined,
    currency:    currency || 'COP',
    monthlyPrice,
    annualPrice,
    maxSeats,
    sortOrder,
    features,
    isPublic,
    isActive,
  })

  revalidatePath('/dashboard/plans')
}
