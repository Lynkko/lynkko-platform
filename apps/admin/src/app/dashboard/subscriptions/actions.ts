'use server'

import { revalidatePath } from 'next/cache'
import { requireSuperadmin } from '@/lib/session'

const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function updateSubscriptionAction(
  subscriptionId: string,
  planId?: string,
  seats?: number
) {
  await requireSuperadmin()

  const updateData: any = {}
  if (planId) updateData.plan_id = planId
  if (seats !== undefined) updateData.seats = seats

  const response = await fetch(`${baseUrl}/api/subscriptions/${subscriptionId}/update`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update subscription')
  }

  revalidatePath('/dashboard/tenants')
  return response.json()
}

export async function cancelSubscriptionAction(
  subscriptionId: string,
  reason?: string,
  immediate?: boolean
) {
  await requireSuperadmin()

  const response = await fetch(`${baseUrl}/api/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: reason || 'Canceled by admin',
      immediate: immediate ?? true,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to cancel subscription')
  }

  revalidatePath('/dashboard/tenants')
  return response.json()
}
