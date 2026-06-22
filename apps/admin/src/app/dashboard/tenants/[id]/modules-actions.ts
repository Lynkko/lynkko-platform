'use server'

import { revalidatePath } from 'next/cache'
import { requireSuperadmin } from '@/lib/session'

export async function toggleModuleAction(
  tenantId: string,
  moduleId: string,
  enabled: boolean,
  baseUrl: string = process.env.NEXTAUTH_URL || 'http://localhost:3000',
) {
  await requireSuperadmin()

  const response = await fetch(
    `${baseUrl}/api/tenants/${tenantId}/modules/${moduleId}/toggle`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to toggle module: ${response.statusText}`)
  }

  revalidatePath(`/dashboard/tenants/${tenantId}`)
}

export async function toggleAppAction(
  tenantId: string,
  appId: string,
  enabled: boolean,
  baseUrl: string = process.env.NEXTAUTH_URL || 'http://localhost:3000',
) {
  await requireSuperadmin()

  const response = await fetch(
    `${baseUrl}/api/tenants/${tenantId}/apps/${appId}/toggle`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to toggle app: ${response.statusText}`)
  }

  revalidatePath(`/dashboard/tenants/${tenantId}`)
}
