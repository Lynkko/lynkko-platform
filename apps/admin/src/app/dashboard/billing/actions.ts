'use server'

import { revalidatePath } from 'next/cache'
import { requireSuperadmin } from '@/lib/session'

const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

interface InvoiceItem {
  app_id?: string
  subscription_id?: string
  description: string
  quantity?: number
  unit_price: number
}

export async function createInvoiceAction(
  tenantId: string,
  items: InvoiceItem[],
  options?: {
    currency?: string
    tax?: number
    notes?: string
    due_date?: string
  }
) {
  await requireSuperadmin()

  const response = await fetch(`${baseUrl}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant_id: tenantId,
      items,
      ...options,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create invoice')
  }

  revalidatePath('/dashboard/billing')
  return response.json()
}

export async function updateInvoiceAction(
  invoiceId: string,
  data: {
    status?: string
    due_date?: string
    notes?: string
  }
) {
  await requireSuperadmin()

  const response = await fetch(`${baseUrl}/api/invoices/${invoiceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update invoice')
  }

  revalidatePath('/dashboard/billing')
  return response.json()
}

export async function markInvoicePaidAction(
  invoiceId: string,
  wompiTransactionId?: string,
  paymentMethod?: any
) {
  await requireSuperadmin()

  const response = await fetch(`${baseUrl}/api/invoices/${invoiceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wompi_transaction_id: wompiTransactionId,
      payment_method: paymentMethod,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to mark invoice as paid')
  }

  revalidatePath('/dashboard/billing')
  return response.json()
}
