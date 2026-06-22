import { ok, unauthorized, serverError } from '@lynkko/utils'
import { processPendingWebhooks, archiveOldDeliveries } from '@/lib/webhook-queue'
import type { NextRequest } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/webhook-retry
 * Process pending webhook deliveries and retries (call from cron, every 5 minutes)
 * Protected by CRON_SECRET
 */
export async function GET(req: NextRequest) {
  try {
    // Validate CRON_SECRET
    const authHeader = req.headers.get('authorization')
    const expectedAuth = `Bearer ${CRON_SECRET}`

    if (authHeader !== expectedAuth || !CRON_SECRET) {
      return unauthorized('Invalid cron secret')
    }

    console.log('🔄 [Cron] Iniciando retry de webhooks pendientes...')
    const startTime = Date.now()

    // Process pending webhooks
    const result = await processPendingWebhooks()

    console.log(
      `✨ Webhook retry completado: ${result.delivered} entregados, ${result.failed} fallidos, ${result.total} total (${Date.now() - startTime}ms)`
    )

    // Archive old deliveries (every hour, clean up old completed/failed deliveries)
    const hour = new Date().getHours()
    if (hour % 1 === 0) {
      // Run every hour
      await archiveOldDeliveries(7) // Archive deliveries older than 7 days
      console.log('🗑️ Deliveries archivados (>7 dias)')
    }

    return ok({
      status: 'completed',
      delivered: result.delivered,
      failed: result.failed,
      total: result.total,
      duration_ms: Date.now() - startTime,
    })
  } catch (error) {
    console.error('[Cron] Webhook retry error:', error)
    return serverError('Webhook retry failed')
  }
}
