import { db, platformSchema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, badRequest, notFound, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

interface Params {
  params: Promise<{ invoiceId: string }>
}

/**
 * GET /api/invoices/{invoiceId}
 * Get a specific invoice with line items
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { invoiceId } = await params

    // Get invoice
    const [invoice] = await db
      .select()
      .from(platformSchema.invoices)
      .where(eq(platformSchema.invoices.id, invoiceId))
      .limit(1)

    if (!invoice) {
      return notFound('Invoice not found')
    }

    // Get invoice items
    const items = await db
      .select()
      .from(platformSchema.invoiceItems)
      .where(eq(platformSchema.invoiceItems.invoiceId, invoiceId))

    return ok({
      invoice: {
        ...invoice,
        items,
      },
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return serverError('Failed to fetch invoice')
  }
}

/**
 * PUT /api/invoices/{invoiceId}
 * Update invoice (status, due date, notes)
 * Body: { status?: string, due_date?: string, notes?: string }
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { invoiceId } = await params
    const body = await req.json()
    const { status, due_date, notes } = body

    // Get invoice
    const [invoice] = await db
      .select()
      .from(platformSchema.invoices)
      .where(eq(platformSchema.invoices.id, invoiceId))
      .limit(1)

    if (!invoice) {
      return notFound('Invoice not found')
    }

    // Validate status if provided
    const validStatuses = ['draft', 'open', 'paid', 'void']
    if (status && !validStatuses.includes(status)) {
      return badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
    }

    // Build update object
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (due_date !== undefined) updateData.dueDate = new Date(due_date)
    if (notes !== undefined) updateData.notes = notes
    if (Object.keys(updateData).length === 0) {
      return badRequest('No fields to update')
    }

    // Update invoice
    await db
      .update(platformSchema.invoices)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(platformSchema.invoices.id, invoiceId))

    // Get updated invoice
    const [updated] = await db
      .select()
      .from(platformSchema.invoices)
      .where(eq(platformSchema.invoices.id, invoiceId))
      .limit(1)

    return ok({
      status: 'updated',
      invoice: updated,
    })
  } catch (error) {
    console.error('Error updating invoice:', error)
    return serverError('Failed to update invoice')
  }
}

/**
 * POST /api/invoices/{invoiceId}/mark-paid
 * Mark an invoice as paid (optionally with Wompi transaction details)
 * Body: {
 *   wompi_transaction_id?: string
 *   payment_method?: object
 * }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { invoiceId } = await params
    const body = await req.json()
    const { wompi_transaction_id, payment_method } = body

    // Get invoice
    const [invoice] = await db
      .select()
      .from(platformSchema.invoices)
      .where(eq(platformSchema.invoices.id, invoiceId))
      .limit(1)

    if (!invoice) {
      return notFound('Invoice not found')
    }

    if (invoice.status === 'paid') {
      return badRequest('Invoice is already paid')
    }

    // Mark as paid
    await db
      .update(platformSchema.invoices)
      .set({
        status: 'paid',
        paidAt: new Date(),
        wompiTransactionId: wompi_transaction_id || null,
        wompiPaymentMethod: payment_method || null,
        updatedAt: new Date(),
      })
      .where(eq(platformSchema.invoices.id, invoiceId))

    // Get updated invoice
    const [updated] = await db
      .select()
      .from(platformSchema.invoices)
      .where(eq(platformSchema.invoices.id, invoiceId))
      .limit(1)

    return ok({
      status: 'paid',
      invoice: updated,
    })
  } catch (error) {
    console.error('Error marking invoice as paid:', error)
    return serverError('Failed to mark invoice as paid')
  }
}
