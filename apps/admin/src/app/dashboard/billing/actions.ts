'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db, platformSchema } from '@/lib/db'
import { requireSuperadmin } from '@/lib/session'

interface InvoiceItem {
  description: string
  quantity?: number
  unit_price: number
  app_id?: string
  subscription_id?: string
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

  if (!tenantId || !items || items.length === 0) {
    throw new Error('Se requiere tenant_id e ítems')
  }

  const subtotal = items.reduce((sum, item) => {
    return sum + item.unit_price * (item.quantity ?? 1)
  }, 0)

  const taxAmount = options?.tax ?? 0
  const total = subtotal + taxAmount

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  const invoiceNumber = `INV-${dateStr}-${randomSuffix}`

  const [invoice] = await db
    .insert(platformSchema.invoices)
    .values({
      number: invoiceNumber,
      tenantId,
      status: 'open',
      currency: options?.currency ?? 'COP',
      subtotal,
      tax: taxAmount,
      total,
      dueDate: options?.due_date ? new Date(options.due_date) : null,
      notes: options?.notes || null,
    })
    .returning()

  await db.insert(platformSchema.invoiceItems).values(
    items.map((item) => ({
      invoiceId: invoice.id,
      appId: item.app_id || null,
      subscriptionId: item.subscription_id || null,
      description: item.description,
      quantity: item.quantity ?? 1,
      unitPrice: item.unit_price,
      amount: item.unit_price * (item.quantity ?? 1),
    }))
  )

  revalidatePath('/dashboard/billing')
  revalidatePath(`/dashboard/tenants/${tenantId}`)
  return invoice
}

export async function updateInvoiceAction(
  invoiceId: string,
  data: { status?: string; due_date?: string; notes?: string }
) {
  await requireSuperadmin()

  await db
    .update(platformSchema.invoices)
    .set({
      ...(data.status ? { status: data.status as any } : {}),
      ...(data.due_date ? { dueDate: new Date(data.due_date) } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(platformSchema.invoices.id, invoiceId))

  revalidatePath('/dashboard/billing')
}

export async function markInvoicePaidAction(invoiceId: string) {
  await requireSuperadmin()

  await db
    .update(platformSchema.invoices)
    .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
    .where(eq(platformSchema.invoices.id, invoiceId))

  revalidatePath('/dashboard/billing')
}
