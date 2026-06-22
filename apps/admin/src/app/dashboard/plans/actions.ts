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

export async function updatePlanAction(
  planId: string,
  formData: FormData
) {
  await requireSuperadmin()

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const updateData: any = {}

  const name = formData.get('name')
  if (name) updateData.name = (name as string).trim()

  const description = formData.get('description')
  if (description !== null) updateData.description = (description as string).trim() || null

  const monthlyPrice = formData.get('monthlyPrice')
  if (monthlyPrice) updateData.monthly_price = Number(monthlyPrice)

  const annualPrice = formData.get('annualPrice')
  if (annualPrice) updateData.annual_price = Number(annualPrice)

  const maxSeats = formData.get('maxSeats')
  if (maxSeats) updateData.max_seats = Number(maxSeats)

  const sortOrder = formData.get('sortOrder')
  if (sortOrder) updateData.sort_order = Number(sortOrder)

  const featuresRaw = formData.get('features')
  if (featuresRaw) {
    updateData.features = (featuresRaw as string)
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)
  }

  const isPublic = formData.get('isPublic')
  if (isPublic !== null) updateData.is_public = isPublic === 'on'

  const isActive = formData.get('isActive')
  if (isActive !== null) updateData.is_active = isActive === 'on'

  const response = await fetch(`${baseUrl}/api/plans/${planId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update plan')
  }

  revalidatePath('/dashboard/plans')
}

export async function deletePlanAction(planId: string) {
  await requireSuperadmin()

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/plans/${planId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete plan')
  }

  revalidatePath('/dashboard/plans')
}
