import { db, platformSchema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, badRequest, serverError } from '@lynkko/utils'
import { verifyWebhookSignature, parseWebhookPayload } from '@/lib/wompi'
import { logAuditEvent } from '@/lib/audit-log'
import type { NextRequest } from 'next/server'

const WOMPI_WEBHOOK_SECRET = process.env.WOMPI_WEBHOOK_SECRET

/**
 * POST /api/webhooks/wompi
 * Handle Wompi payment webhooks
 * Wompi sends: POST with signature header and JSON payload
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-wompi-signature')

    // Verify webhook signature
    if (!signature || !WOMPI_WEBHOOK_SECRET) {
      return badRequest('Missing signature or webhook secret')
    }

    const isValid = verifyWebhookSignature(body, signature, WOMPI_WEBHOOK_SECRET)
    if (!isValid) {
      return badRequest('Invalid webhook signature')
    }

    // Parse payload
    const webhook = parseWebhookPayload(body)
    if (!webhook) {
      return badRequest('Invalid webhook payload')
    }

    console.log(`🪝 Webhook Wompi recibido: ${webhook.event} - ${webhook.data.reference}`)

    const { event, data } = webhook

    // Handle transaction events
    if (
      event === 'transaction.updated' ||
      event === 'transaction.confirmed' ||
      event === 'transaction.declined'
    ) {
      // Find the Wompi transaction by reference
      const [wompiTx] = await db
        .select()
        .from(platformSchema.wompiTransactions)
        .where(eq(platformSchema.wompiTransactions.reference, data.reference))
        .limit(1)

      if (!wompiTx) {
        console.log(`⚠️ Transacción Wompi no encontrada: ${data.reference}`)
        return ok({ status: 'ok', message: 'Transaction not found (may be stale)' })
      }

      const invoice = await db.query.invoices.findFirst({
        where: eq(platformSchema.invoices.id, wompiTx.invoiceId),
      })

      if (!invoice) {
        return ok({ status: 'ok', message: 'Invoice not found' })
      }

      // Update transaction status
      await db
        .update(platformSchema.wompiTransactions)
        .set({
          status: data.status,
          wompiResponse: { ...data },
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(platformSchema.wompiTransactions.id, wompiTx.id))

      // Handle payment success
      if (data.status === 'APPROVED') {
        // Mark invoice as paid
        await db
          .update(platformSchema.invoices)
          .set({
            status: 'paid',
            paidAt: new Date(),
            wompiTransactionId: data.id,
            updatedAt: new Date(),
          })
          .where(eq(platformSchema.invoices.id, wompiTx.invoiceId))

        // Update billing cycle
        const [billingCycle] = await db
          .select()
          .from(platformSchema.billingCycles)
          .where(eq(platformSchema.billingCycles.invoiceId, wompiTx.invoiceId))
          .limit(1)

        if (billingCycle) {
          await db
            .update(platformSchema.billingCycles)
            .set({
              paymentStatus: 'completed',
              paymentAttempts: (billingCycle.paymentAttempts || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(platformSchema.billingCycles.id, billingCycle.id))
        }

        // Remove from failed payments queue (if exists)
        await db
          .update(platformSchema.failedPayments)
          .set({
            resolvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(platformSchema.failedPayments.invoiceId, wompiTx.invoiceId))

        // Log success
        await logAuditEvent(
          {
            userId: 'wompi:webhook',
            resourceType: 'invoice',
            resourceId: wompiTx.invoiceId,
            action: 'update',
            metadata: {
              wompiTransactionId: data.id,
              wompiStatus: data.status,
              webhook: true,
            },
            status: 'success',
          }
        )

        console.log(`✅ Pago confirmado por webhook: ${data.reference}`)
      } else if (data.status === 'DECLINED') {
        // Payment declined
        const [billingCycle] = await db
          .select()
          .from(platformSchema.billingCycles)
          .where(eq(platformSchema.billingCycles.invoiceId, wompiTx.invoiceId))
          .limit(1)

        if (billingCycle) {
          await db
            .update(platformSchema.billingCycles)
            .set({
              paymentStatus: 'failed',
              paymentAttempts: (billingCycle.paymentAttempts || 0) + 1,
              lastPaymentAttemptAt: new Date(),
              lastPaymentError: `Wompi declined: ${data.payment_method?.type || 'unknown'}`,
              updatedAt: new Date(),
            })
            .where(eq(platformSchema.billingCycles.id, billingCycle.id))
        }

        console.log(`❌ Pago rechazado por webhook: ${data.reference}`)
      }
    }

    return ok({
      status: 'ok',
      event,
      reference: data.reference,
    })
  } catch (error) {
    console.error('Wompi webhook error:', error)
    return serverError('Wompi webhook processing failed')
  }
}
