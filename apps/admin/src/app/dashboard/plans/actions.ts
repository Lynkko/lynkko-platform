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
    name:         name.trim(),
    slug:         slug.trim(),
    description:  description?.trim() || undefined,
    billingModel: (formData.get('billingModel') as 'flat' | 'per_seat') || 'flat',
    currency:     currency || 'COP',
    monthlyPrice,
    annualPrice,
    pricePerSeat: Number(formData.get('pricePerSeat')) || 0,
    maxSeats,
    sortOrder,
    features,
    isPublic,
    isActive,
  })

  revalidatePath('/dashboard/plans')
}

export async function updatePlanAction(planId: string, formData: FormData) {
  await requireSuperadmin()

  const featuresRaw = formData.get('features') as string | null
  const data: Partial<{
    name: string
    description: string
    billingModel: 'flat' | 'per_seat'
    monthlyPrice: number
    annualPrice: number
    pricePerSeat: number
    maxSeats: number
    sortOrder: number
    features: string[]
    isPublic: boolean
    isActive: boolean
  }> = {}

  const name = (formData.get('name') as string)?.trim()
  if (name) data.name = name

  const desc = (formData.get('description') as string)?.trim()
  data.description = desc || undefined

  const billingModel = formData.get('billingModel') as string
  if (billingModel) data.billingModel = billingModel as 'flat' | 'per_seat'

  const pricePerSeat = formData.get('pricePerSeat')
  if (pricePerSeat !== null) data.pricePerSeat = Number(pricePerSeat) || 0

  const monthlyPrice = formData.get('monthlyPrice')
  if (monthlyPrice) data.monthlyPrice = Number(monthlyPrice)

  const annualPrice = formData.get('annualPrice')
  if (annualPrice !== null) data.annualPrice = Number(annualPrice) || 0

  const maxSeats = formData.get('maxSeats')
  if (maxSeats) data.maxSeats = Number(maxSeats)

  const sortOrder = formData.get('sortOrder')
  if (sortOrder) data.sortOrder = Number(sortOrder) || 0

  if (featuresRaw !== null) {
    data.features = featuresRaw
      ? featuresRaw.split('\n').map((f) => f.trim()).filter(Boolean)
      : []
  }

  data.isPublic = formData.get('isPublic') === 'on'
  data.isActive = formData.get('isActive') === 'on'

  await platform.updatePlan(planId, data)
  revalidatePath('/dashboard/plans')
}

export async function deletePlanAction(planId: string) {
  await requireSuperadmin()
  await platform.deletePlan(planId)
  revalidatePath('/dashboard/plans')
}
