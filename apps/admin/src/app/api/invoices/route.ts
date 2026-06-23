import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, badRequest, notFound, serverError } from '@lynkko/utils'
import type { NextRequest } from 'next/server'

interface InvoiceItem {
  app_id?: string
  subscription_id?: string
  description: string
  quantity?: number
  unit_price: number
}

/**
 * POST /api/invoices
 * Create an invoice for a tenant
 * Body: {
 *   tenant_id: string
 *   items: InvoiceItem[]
 *   currency?: string
 *   tax?: number
 *   notes?: string
 *   due_date?: string (ISO date)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tenant_id,
      items,
      currency,
      tax,
      notes,
      due_date,
    } = body

    // Validate required fields
    if (!tenant_id || !items || !Array.isArray(items) || items.length === 0) {
      return badRequest('Missing required fields: tenant_id, items[]')
    }

    // Validate tenant exists
    const [tenant] = await db
      .select()
      .from(platformSchema.tenants)
      .where(eq(platformSchema.tenants.id, tenant_id))
      .limit(1)

    if (!tenant) {
      return notFound('Tenant not found')
    }

    // Validate items
    for (const item of items) {
      if (!item.description || item.unit_price === undefined) {
        return badRequest('Each item must have description and unit_price')
      }
      if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
        return badRequest('unit_price must be a non-negative number')
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const quantity = item.quantity ?? 1
      return sum + item.unit_price * quantity
    }, 0)

    const taxAmount = tax ?? 0
    const total = subtotal + taxAmount

    // Generate invoice number
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase()
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`

    // Create invoice
    const [invoice] = await db
      .insert(platformSchema.invoices)
      .values({
        number: invoiceNumber,
        tenantId: tenant_id,
        status: 'open',
        currency: currency ?? 'COP',
        subtotal,
        tax: taxAmount,
        total,
        dueDate: due_date ? new Date(due_date) : null,
        notes: notes || null,
      })
      .returning()

    // Create invoice items
    if (items.length > 0) {
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
    }

    return ok({
      status: 'created',
      invoice: {
        id: invoice.id,
        number: invoice.number,
        tenant_id: invoice.tenantId,
        status: invoice.status,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        currency: invoice.currency,
        due_date: invoice.dueDate,
        created_at: invoice.createdAt,
      },
      items_count: items.length,
    })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return serverError('Failed to create invoice')
  }
}

/**
 * GET /api/invoices
 * List invoices for a tenant or all invoices
 * Query: ?tenant_id={tenantId}&status=open&limit=50
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const tenantId = searchParams.get('tenant_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    const conditions = [
      tenantId ? eq(platformSchema.invoices.tenantId, tenantId) : undefined,
      status ? eq(platformSchema.invoices.status, status) : undefined,
    ].filter(Boolean) as any[]

    const invoices = await db
      .select()
      .from(platformSchema.invoices)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(limit)
      .orderBy(platformSchema.invoices.createdAt)

    return ok({
      invoices,
      total: invoices.length,
      filtered_by: {
        tenant_id: tenantId,
        status,
      },
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return serverError('Failed to fetch invoices')
  }
}
