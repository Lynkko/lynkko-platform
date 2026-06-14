import { createHmac, timingSafeEqual } from 'crypto'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WebhookPayload<T = Record<string, unknown>> {
  event: string
  occurred_at: string
  data: T
}

export interface WebhookEndpoint {
  url: string
  secret: string
  events?: string[]
}

export interface DispatchResult {
  url: string
  success: boolean
  statusCode?: number
  error?: string
}

// ─── Signing ──────────────────────────────────────────────────────────────────

/**
 * Genera la firma HMAC-SHA256 para un payload de webhook.
 * Formato: sha256=<hex>
 *
 * @example
 * const sig = signWebhook(secret, rawBody, timestamp)
 * // "sha256=abc123..."
 */
export function signWebhook(secret: string, body: string, timestamp: number): string {
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex')
  return `sha256=${signature}`
}

/**
 * Verifica que una firma recibida sea válida.
 * Usa comparación timing-safe para evitar timing attacks.
 */
export function verifyWebhook(
  secret: string,
  body: string,
  signature: string,
  timestamp: number,
  /** Margen de tolerancia en ms. Por defecto 5 minutos. */
  toleranceMs = 5 * 60 * 1000,
): boolean {
  // Rechazar timestamps demasiado viejos (replay attack protection)
  if (Math.abs(Date.now() - timestamp) > toleranceMs) return false

  const expected = signWebhook(secret, body, timestamp)

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

/**
 * Construye los headers estándar X-Lynkko-* para un webhook outbound.
 */
export function webhookHeaders(
  secret: string,
  body: string,
  event: string,
): Record<string, string> {
  const timestamp = Date.now()
  const signature = signWebhook(secret, body, timestamp)

  return {
    'Content-Type': 'application/json',
    'X-Lynkko-Signature': signature,
    'X-Lynkko-Event': event,
    'X-Lynkko-Timestamp': String(timestamp),
  }
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

/**
 * Envía un webhook a un único endpoint (best-effort, fire-and-forget).
 * No lanza excepciones — retorna el resultado para logging.
 *
 * @example
 * await dispatchWebhook(
 *   { url: 'https://...', secret: 'abc' },
 *   'lead.created',
 *   { id: '123', name: 'Juan' }
 * )
 */
export async function dispatchWebhook<T = Record<string, unknown>>(
  endpoint: WebhookEndpoint,
  event: string,
  data: T,
  timeoutMs = 8_000,
): Promise<DispatchResult> {
  const payload: WebhookPayload<T> = {
    event,
    occurred_at: new Date().toISOString(),
    data,
  }

  const body = JSON.stringify(payload)
  const headers = webhookHeaders(endpoint.secret, body, event)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    })

    return {
      url: endpoint.url,
      success: res.ok,
      statusCode: res.status,
    }
  } catch (err) {
    return {
      url: endpoint.url,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Despacha un evento a múltiples endpoints en paralelo (best-effort).
 * Filtra automáticamente endpoints que no escuchan el evento.
 *
 * @example
 * const endpoints = await db.select().from(webhookEndpoints)
 *   .where(eq(webhookEndpoints.tenantId, tenantId))
 *
 * void dispatchWebhookToMany(endpoints, 'lead.created', { id: '123' })
 */
export async function dispatchWebhookToMany<T = Record<string, unknown>>(
  endpoints: WebhookEndpoint[],
  event: string,
  data: T,
  timeoutMs = 8_000,
): Promise<DispatchResult[]> {
  const targets = endpoints.filter(
    e => !e.events || e.events.includes(event) || e.events.includes('*'),
  )

  if (targets.length === 0) return []

  const results = await Promise.allSettled(
    targets.map(e => dispatchWebhook(e, event, data, timeoutMs)),
  )

  return results.map(r =>
    r.status === 'fulfilled'
      ? r.value
      : { url: '', success: false, error: String(r.reason) },
  )
}
