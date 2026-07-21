/**
 * Wompi Payment Integration
 * https://developer.wompi.co/
 *
 * MODO test/producción: la config (llaves + URL) se resuelve en runtime desde
 * `platform_settings.wompi_mode` ('test' | 'production'). Así un toggle en el panel
 * alterna sandbox↔producción sin redeploy ni cambiar variables. Cada set de llaves
 * vive en env: test = WOMPI_{PUBLIC,PRIVATE,WEBHOOK,INTEGRITY}_*; prod = *_PROD.
 */
import { eq } from 'drizzle-orm'
import { db, platformSchema } from './db'

export type WompiMode = 'test' | 'production'

export interface WompiConfig {
  mode: WompiMode
  apiUrl: string
  publicKey: string
  privateKey: string
  webhookSecret: string
  integritySecret: string
}

/** Lee el modo activo desde platform_settings (fallback env WOMPI_MODE, luego 'test'). */
export async function getWompiMode(): Promise<WompiMode> {
  try {
    const [row] = await db
      .select({ value: platformSchema.platformSettings.value })
      .from(platformSchema.platformSettings)
      .where(eq(platformSchema.platformSettings.key, 'wompi_mode'))
      .limit(1)
    const v = row?.value as unknown
    const mode = typeof v === 'string' ? v : (v as { mode?: string } | null)?.mode
    if (mode === 'production' || mode === 'test') return mode
  } catch {
    // sin DB → cae a env
  }
  return process.env.WOMPI_MODE === 'production' ? 'production' : 'test'
}

/** Resuelve las llaves + URL de Wompi según el modo activo. */
export async function getWompiConfig(): Promise<WompiConfig> {
  const mode = await getWompiMode()
  if (mode === 'production') {
    return {
      mode,
      apiUrl: (process.env.WOMPI_API_URL_PROD ?? 'https://production.wompi.co/v1').replace(/\/+$/, ''),
      publicKey: process.env.WOMPI_PUBLIC_KEY_PROD ?? '',
      privateKey: process.env.WOMPI_PRIVATE_KEY_PROD ?? '',
      webhookSecret: process.env.WOMPI_WEBHOOK_SECRET_PROD ?? '',
      integritySecret: process.env.WOMPI_INTEGRITY_SECRET_PROD ?? '',
    }
  }
  return {
    mode,
    apiUrl: (process.env.WOMPI_API_URL ?? 'https://sandbox.wompi.co/v1').replace(/\/+$/, ''),
    publicKey: process.env.WOMPI_PUBLIC_KEY ?? '',
    privateKey: process.env.WOMPI_PRIVATE_KEY ?? '',
    webhookSecret: process.env.WOMPI_WEBHOOK_SECRET ?? '',
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET ?? '',
  }
}

export interface WompiTransaction {
  reference: string
  amountInCents: number
  currency: string
  customerEmail: string
  customerName: string
  /** Pago único con token de tarjeta (un solo uso). */
  paymentMethod?: {
    type: 'CARD'
    token: string
    installments?: number
  }
  /** Cobro recurrente: id de un payment_source reusable (creado con createPaymentSource). */
  paymentSourceId?: string | number
  redirectUrl?: string
  metadata?: Record<string, any>
}

export interface WompiPaymentSource {
  id: string
  last4: string
  brand: string
  expMonth: string
  expYear: string
  holder: string
}

export interface WompiResponse {
  data?: {
    id: string
    reference: string
    amount_in_cents: number
    currency: string
    payment_method: {
      type: string
      token?: string
    }
    status: string
    created_at: string
    updated_at: string
  }
  errors?: Array<{
    code: string
    message: string
  }>
}

/**
 * Obtiene el acceptance_token del comercio (Wompi lo exige en cada transacción:
 * es la aceptación de términos del titular). GET /merchants/{public_key}.
 */
export async function getAcceptanceToken(cfg?: WompiConfig): Promise<string | null> {
  try {
    const { apiUrl, publicKey } = cfg ?? (await getWompiConfig())
    const res = await fetch(`${apiUrl}/merchants/${publicKey}`)
    const data = await res.json()
    return data?.data?.presigned_acceptance?.acceptance_token ?? null
  } catch (error) {
    console.error('Wompi acceptance token error:', error)
    return null
  }
}

/**
 * Process a payment with Wompi
 */
export async function processPayment(transaction: WompiTransaction): Promise<WompiResponse> {
  try {
    const cfg = await getWompiConfig()
    const acceptanceToken = await getAcceptanceToken(cfg)
    // Cobro recurrente (payment_source_id) vs pago único (token de tarjeta).
    // Con payment_source_id, Wompi exige payment_method con installments.
    const paymentBody = transaction.paymentSourceId
      ? {
          payment_source_id: Number(transaction.paymentSourceId),
          payment_method: { installments: transaction.paymentMethod?.installments ?? 1 },
        }
      : { payment_method: transaction.paymentMethod }
    const response = await fetch(`${cfg.apiUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.privateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        acceptance_token: acceptanceToken,
        reference: transaction.reference,
        amount_in_cents: transaction.amountInCents,
        currency: transaction.currency,
        customer_email: transaction.customerEmail,
        customer_name: transaction.customerName,
        ...paymentBody,
        redirect_url: transaction.redirectUrl,
        metadata: transaction.metadata,
      }),
    })

    const data: WompiResponse = await response.json()

    if (!response.ok) {
      console.error('Wompi payment error:', data.errors)
      return data
    }

    return data
  } catch (error) {
    console.error('Wompi API error:', error)
    return {
      errors: [
        {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      ],
    }
  }
}

/**
 * Get transaction status from Wompi
 */
export async function getTransactionStatus(transactionId: string): Promise<WompiResponse> {
  try {
    const cfg = await getWompiConfig()
    const response = await fetch(`${cfg.apiUrl}/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cfg.privateKey}`,
      },
    })

    return await response.json()
  } catch (error) {
    console.error('Wompi get transaction error:', error)
    return {
      errors: [
        {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      ],
    }
  }
}

/**
 * Tokenize a payment method (card) with Wompi
 */
export async function tokenizePaymentMethod(card: {
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  cardholderName: string
}): Promise<{ token: string } | null> {
  try {
    const { apiUrl, publicKey } = await getWompiConfig()
    // Wompi: POST /v1/tokens/cards con Bearer <public_key> y body plano.
    const response = await fetch(`${apiUrl}/tokens/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: card.cardNumber,
        exp_month: card.expiryMonth,
        exp_year: card.expiryYear,
        cvc: card.cvv,
        card_holder: card.cardholderName,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.data?.id) {
      console.error('Wompi tokenization error:', JSON.stringify(data))
      return null
    }

    return {
      token: data.data.id,
    }
  } catch (error) {
    console.error('Wompi tokenization error:', error)
    return null
  }
}

/**
 * Crea un payment_source reusable a partir de un token de tarjeta (un solo uso).
 * El token se genera en el navegador (browser → Wompi directo), así el servidor
 * nunca ve el número de tarjeta. El id devuelto (numérico) se cobra recurrentemente
 * vía processPayment({ paymentSourceId }). POST /payment_sources.
 */
export async function createPaymentSource(
  cardToken: string,
  customerEmail: string,
): Promise<WompiPaymentSource> {
  const cfg = await getWompiConfig()
  const acceptanceToken = await getAcceptanceToken(cfg)
  const res = await fetch(`${cfg.apiUrl}/payment_sources`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.privateKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'CARD',
      token: cardToken,
      customer_email: customerEmail,
      acceptance_token: acceptanceToken,
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.data?.id) {
    const msg = data?.error?.messages?.[0] ?? data?.error?.reason ?? data?.error ?? 'Error creando fuente de pago'
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  const src = data.data
  return {
    id:       String(src.id),
    last4:    src.public_data?.last_four ?? '****',
    brand:    src.public_data?.brand ?? src.type ?? 'CARD',
    expMonth: src.public_data?.exp_month ?? '',
    expYear:  src.public_data?.exp_year ?? '',
    holder:   src.public_data?.name ?? '',
  }
}

/**
 * Calculate payment amount with fee
 * Wompi typically charges a percentage fee
 */
export function calculatePaymentAmount(
  baseAmount: number,
  taxPercent: number = 3.5
): number {
  // baseAmount is in cents
  // Calculate fee: baseAmount * (1 + taxPercent/100)
  return Math.ceil(baseAmount * (1 + taxPercent / 100))
}

/**
 * Verify Wompi webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return hash === signature
}

/**
 * Parse Wompi webhook payload
 */
export interface WompiWebhookPayload {
  event: string
  data: {
    id: string
    reference: string
    amount_in_cents: number
    status: string
    payment_method?: {
      type: string
    }
    created_at: string
  }
}

export function parseWebhookPayload(payload: string): WompiWebhookPayload | null {
  try {
    return JSON.parse(payload)
  } catch (error) {
    console.error('Invalid webhook payload:', error)
    return null
  }
}
