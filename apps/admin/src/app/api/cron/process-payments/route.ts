import { db, platformSchema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { ok, unauthorized, serverError } from '@lynkko/utils'
import { processPayment, calculatePaymentAmount } from '@/lib/wompi'
import { logAuditEvent } from '@/lib/audit-log'
import type { NextRequest } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/process-payments
 * Process pending payments using Wompi
 * Protected by CRON_SECRET
 * Schedule: Daily at 2:30am UTC (after generate-invoices)
 */
export async function GET(req: NextRequest) {
  try {
    // Validate CRON_SECRET
    const authHeader = req.headers.get('authorization')
    const expectedAuth = `Bearer ${CRON_SECRET}`

    if (authHeader !== expectedAuth || !CRON_SECRET) {
      return unauthorized('Invalid cron secret')
    }

    console.log('💳 [Cron] Iniciando procesamiento automático de pagos...')
    const startTime = Date.now()

    let processed = 0
    let succeeded = 0
    let failed = 0

    // Get all invoices with status 'open' and due billing cycles
    const invoicesToPay = await db
      .select({
        invoice: platformSchema.invoices,
        billingCycle: platformSchema.billingCycles,
        subscription: platformSchema.subscriptions,
        paymentMethod: platformSchema.paymentMethods,
      })
      .from(platformSchema.invoices)
      .innerJoin(
        platformSchema.billingCycles,
        eq(platformSchema.billingCycles.invoiceId, platformSchema.invoices.id)
      )
      .innerJoin(
        platformSchema.subscriptions,
        eq(platformSchema.billingCycles.subscriptionId, platformSchema.subscriptions.id)
      )
      .leftJoin(
        platformSchema.paymentMethods,
        and(
          eq(platformSchema.paymentMethods.tenantId, platformSchema.invoices.tenantId),
          eq(platformSchema.paymentMethods.isDefault, true),
          eq(platformSchema.paymentMethods.isActive, true)
        )
      )
      .where(
        and(
          eq(platformSchema.invoices.status, 'open'),
          eq(platformSchema.billingCycles.paymentStatus, 'processing')
        )
      )

    console.log(`📊 Encontrados ${invoicesToPay.length} pagos pendientes`)

    for (const row of invoicesToPay) {
      try {
        const { invoice, billingCycle, subscription, paymentMethod } = row

        // Check if tenant has a default payment method
        if (!paymentMethod || !paymentMethod.token) {
          console.log(
            `⏭️ Saltando pago para tenant ${invoice.tenantId} (sin método de pago por defecto)`
          )
          continue
        }

        // Calculate payment amount with fees
        const amountInCents = calculatePaymentAmount(invoice.total)

        // Process payment with Wompi
        const reference = `INV-${invoice.id.slice(0, 8)}-${Date.now()}`

        console.log(`💳 Procesando pago ${reference} por $${(amountInCents / 100).toFixed(2)}`)

        const wompiResult = await processPayment({
          reference,
          amountInCents,
          currency: invoice.currency,
          customerEmail: 'billing@example.com', // Should come from tenant
          customerName: invoice.tenantId,
          paymentMethod: {
            type: 'CARD',
            token: paymentMethod.token,
          },
          metadata: {
            invoiceId: invoice.id,
            subscriptionId: subscription.id,
          },
        })

        processed++

        if (wompiResult.data?.status === 'APPROVED') {
          // Payment successful
          await db
            .insert(platformSchema.wompiTransactions)
            .values({
              invoiceId: invoice.id,
              subscriptionId: subscription.id,
              tenantId: invoice.tenantId,
              amount: amountInCents,
              currency: invoice.currency,
              reference,
              status: 'APPROVED',
              paymentMethod: {
                type: 'CARD',
                brand: 'CARD',
              },
              wompiResponse: wompiResult.data,
              processedAt: new Date(),
            })

          // Mark invoice as paid
          await db
            .update(platformSchema.invoices)
            .set({
              status: 'paid',
              paidAt: new Date(),
              wompiTransactionId: wompiResult.data.id,
              updatedAt: new Date(),
            })
            .where(eq(platformSchema.invoices.id, invoice.id))

          // Update billing cycle
          await db
            .update(platformSchema.billingCycles)
            .set({
              paymentStatus: 'completed',
              updatedAt: new Date(),
            })
            .where(eq(platformSchema.billingCycles.id, billingCycle.id))

          // Log success
          await logAuditEvent(
            {
              userId: 'system:auto-payment',
              resourceType: 'invoice',
              resourceId: invoice.id,
              action: 'update',
              changes: {
                before: { status: 'open', paidAt: null },
                after: { status: 'paid', paidAt: new Date() },
              },
              metadata: {
                wompiTransactionId: wompiResult.data.id,
                auto: true,
              },
              status: 'success',
            }
          )

          console.log(`✅ Pago aprobado: ${invoice.number}`)
          succeeded++
        } else {
          // Payment failed
          const errorMsg = wompiResult.errors?.[0]?.message || 'Unknown error'

          await db
            .insert(platformSchema.wompiTransactions)
            .values({
              invoiceId: invoice.id,
              subscriptionId: subscription.id,
              tenantId: invoice.tenantId,
              amount: amountInCents,
              currency: invoice.currency,
              reference,
              status: 'DECLINED',
              errorMessage: errorMsg,
              wompiResponse: wompiResult,
              processedAt: new Date(),
            })

          // Create failed payment entry for retry
          await db
            .insert(platformSchema.failedPayments)
            .values({
              invoiceId: invoice.id,
              billingCycleId: billingCycle.id,
              tenantId: invoice.tenantId,
              amount: invoice.total,
              currency: invoice.currency,
              reason: errorMsg.slice(0, 100), // Truncate reason
              attemptCount: 1,
              maxAttempts: 5,
              nextRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Retry tomorrow
            })

          // Log failure
          await logAuditEvent(
            {
              userId: 'system:auto-payment',
              resourceType: 'invoice',
              resourceId: invoice.id,
              action: 'update',
              metadata: { wompiError: errorMsg, auto: true },
              status: 'failure',
              errorMessage: errorMsg,
            }
          )

          console.log(`❌ Pago rechazado: ${reference} - ${errorMsg}`)
          failed++
        }
      } catch (error) {
        console.error(`❌ Error procesando pago para ${row.invoice.id}:`, error)
        failed++
      }
    }

    const duration = Date.now() - startTime
    console.log(
      `✨ Procesamiento completado: ${succeeded}/${processed} exitosos (${duration}ms)`
    )

    return ok({
      status: 'completed',
      processed,
      succeeded,
      failed,
      total: invoicesToPay.length,
      duration_ms: duration,
    })
  } catch (error) {
    console.error('[Cron] Payment processing error:', error)
    return serverError('Payment processing failed')
  }
}
