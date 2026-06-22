import { db, platformSchema } from '@/lib/db'
import { eq, and, lte } from 'drizzle-orm'
import { ok, unauthorized, serverError } from '@lynkko/utils'
import { logAuditEvent } from '@/lib/audit-log'
import type { NextRequest } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/generate-invoices
 * Auto-generate invoices for subscriptions on billing dates
 * Protected by CRON_SECRET
 * Schedule: Daily at 2am UTC (before sync-licenses)
 */
export async function GET(req: NextRequest) {
  try {
    // Validate CRON_SECRET
    const authHeader = req.headers.get('authorization')
    const expectedAuth = `Bearer ${CRON_SECRET}`

    if (authHeader !== expectedAuth || !CRON_SECRET) {
      return unauthorized('Invalid cron secret')
    }

    console.log('🧾 [Cron] Iniciando generación automática de facturas...')
    const startTime = Date.now()

    const now = new Date()
    let generated = 0
    let failed = 0

    // Get all subscriptions with active billing cycles due for invoicing
    const dueBillingCycles = await db
      .select({
        cycle: platformSchema.billingCycles,
        subscription: platformSchema.subscriptions,
        plan: platformSchema.appPlans,
      })
      .from(platformSchema.billingCycles)
      .innerJoin(
        platformSchema.subscriptions,
        eq(platformSchema.billingCycles.subscriptionId, platformSchema.subscriptions.id)
      )
      .innerJoin(
        platformSchema.appPlans,
        eq(platformSchema.subscriptions.planId, platformSchema.appPlans.id)
      )
      .where(
        and(
          lte(platformSchema.billingCycles.nextInvoiceDate, now),
          eq(platformSchema.billingCycles.paymentStatus, 'pending')
        )
      )

    console.log(`📊 Encontrados ${dueBillingCycles.length} ciclos de facturación pendientes`)

    for (const row of dueBillingCycles) {
      try {
        const { cycle, subscription, plan } = row

        // Generate invoice
        const [invoice] = await db
          .insert(platformSchema.invoices)
          .values({
            number: generateInvoiceNumber(),
            tenantId: cycle.tenantId,
            status: 'open',
            currency: plan.currency,
            subtotal: plan.monthlyPrice,
            tax: Math.ceil(plan.monthlyPrice * 0.19), // 19% tax (adjust as needed)
            total: plan.monthlyPrice + Math.ceil(plan.monthlyPrice * 0.19),
            dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // Due in 15 days
            periodStart: cycle.cycleStart,
            periodEnd: cycle.cycleEnd,
            notes: `Auto-generated invoice for ${plan.name}`,
          })
          .returning()

        // Create invoice item
        await db
          .insert(platformSchema.invoiceItems)
          .values({
            invoiceId: invoice.id,
            appId: subscription.appId,
            subscriptionId: subscription.id,
            description: `${plan.name} - ${cycle.cycleStart.toLocaleDateString()} to ${cycle.cycleEnd.toLocaleDateString()}`,
            quantity: 1,
            unitPrice: plan.monthlyPrice,
            amount: plan.monthlyPrice,
          })

        // Update billing cycle
        await db
          .update(platformSchema.billingCycles)
          .set({
            invoiceId: invoice.id,
            invoiceGeneratedAt: new Date(),
            paymentStatus: 'processing',
            updatedAt: new Date(),
          })
          .where(eq(platformSchema.billingCycles.id, cycle.id))

        // Log audit event
        await logAuditEvent(
          {
            userId: 'system:auto-invoicing',
            resourceType: 'invoice',
            resourceId: invoice.id,
            action: 'create',
            metadata: {
              subscriptionId: subscription.id,
              cycleId: cycle.id,
              auto: true,
            },
            status: 'success',
          }
        )

        console.log(`✅ Factura generada: ${invoice.number} para tenant ${cycle.tenantId}`)
        generated++
      } catch (error) {
        console.error(
          `❌ Error generando factura para ciclo ${row.cycle.id}:`,
          error
        )
        failed++
      }
    }

    const duration = Date.now() - startTime
    console.log(
      `✨ Generación completada: ${generated} generadas, ${failed} fallidas (${duration}ms)`
    )

    return ok({
      status: 'completed',
      generated,
      failed,
      total: dueBillingCycles.length,
      duration_ms: duration,
    })
  } catch (error) {
    console.error('[Cron] Invoice generation error:', error)
    return serverError('Invoice generation failed')
  }
}

function generateInvoiceNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `INV-${date}-${rand}`
}
