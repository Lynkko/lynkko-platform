'use server'

import { revalidatePath } from 'next/cache'
import { platform } from '@/lib/platform'
import { requireSuperadmin } from '@/lib/session'

export async function createTenantAction(formData: FormData): Promise<string | null> {
  await requireSuperadmin()

  const name         = formData.get('name') as string
  const slug         = formData.get('slug') as string
  const contactEmail = formData.get('contactEmail') as string | null
  const contactPhone = formData.get('contactPhone') as string | null
  const country      = formData.get('country') as string | null
  const status       = formData.get('status') as 'trial' | 'active' | 'suspended'
  const notes        = formData.get('notes') as string | null

  if (!name?.trim() || !slug?.trim()) return null

  const tenant = await platform.createTenant({
    name:         name.trim(),
    slug:         slug.trim(),
    contactEmail: contactEmail?.trim() || undefined,
    contactPhone: contactPhone?.trim() || undefined,
    country:      country?.trim()      || undefined,
    notes:        notes?.trim()        || undefined,
    status:       status ?? 'trial',
  })

  revalidatePath('/dashboard/tenants')
  return tenant.id
}
