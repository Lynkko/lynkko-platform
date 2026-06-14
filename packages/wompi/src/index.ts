import { createHmac } from 'crypto'

// ─── Types ───────────────────────────────────────────────────────────────────

export type WompiCurrency = 'COP' | 'USD'

export type WompiTransactionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'VOIDED'
  | 'ERROR'

export interface WompiAcceptanceTokens {
  acceptanceToken: string
  personalDataToken: string
}

export interface WompiPaymentSource {
  id: number
  token: string
  brand: string
  lastFour: string
  expYear: string
  expMonth: string
  cardHolder: string
}

export interface WompiTransaction {
  id: string
  status: WompiTransactionStatus
  reference: string
  amountInCents: number
  currency: WompiCurrency
  paymentMethodType: string
  redirectUrl?: string
}

export interface WompiChargeOptions {
  paymentSourceId: number
  amountInCents: number
  currency: WompiCurrency
  reference: string
  customerEmail: string
  redirectUrl?: string
  installments?: number
}

export interface WompiWebhookEvent {
  event: string
  data: {
    transaction: WompiTransaction
  }
  signature: {
    checksum: string
    properties: string[]
  }
  timestamp: number
  sent_at: string
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class WompiClient {
  private readonly baseUrl: string

  constructor(
    private readonly publicKey: string,
    private readonly privateKey: string,
    private readonly eventsSecret?: string,
    sandbox = false,
  ) {
    this.baseUrl = sandbox
      ? 'https://sandbox.wompi.co/v1'
      : 'https://production.wompi.co/v1'
  }

  // ─── Acceptance tokens ──────────────────────────────────────────────────

  /**
   * Obtiene los tokens de aceptación de T&C y política de datos.
   * Requeridos antes de cualquier cobro.
   */
  async getAcceptanceTokens(): Promise<WompiAcceptanceTokens> {
    const res = await fetch(`${this.baseUrl}/merchants/${this.publicKey}`)
    if (!res.ok) throw new WompiError('Error obteniendo merchant info', res.status)

    const json = await res.json() as {
      data: {
        presigned_acceptance: { acceptance_token: string }
        presigned_personal_data_auth: { acceptance_token: string }
      }
    }

    return {
      acceptanceToken: json.data.presigned_acceptance.acceptance_token,
      personalDataToken: json.data.presigned_personal_data_auth.acceptance_token,
    }
  }

  // ─── Payment sources ─────────────────────────────────────────────────────

  /**
   * Tokeniza una tarjeta y crea una fuente de pago reutilizable.
   */
  async createPaymentSource(
    cardToken: string,
    acceptanceToken: string,
    personalDataToken: string,
    customerEmail: string,
  ): Promise<WompiPaymentSource> {
    const res = await fetch(`${this.baseUrl}/payment_sources`, {
      method: 'POST',
      headers: this.privateHeaders(),
      body: JSON.stringify({
        type: 'CARD',
        token: cardToken,
        customer_email: customerEmail,
        acceptance_token: acceptanceToken,
        accept_personal_auth: personalDataToken,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { messages?: Record<string, string[]> } }
      const msg = Object.values(err.error?.messages ?? {}).flat().join(', ') || 'Error creando fuente de pago'
      throw new WompiError(msg, res.status)
    }

    const json = await res.json() as {
      data: {
        id: number
        token: string
        public_data: {
          brand: string
          last_four: string
          exp_year: string
          exp_month: string
          card_holder: string
        }
      }
    }

    return {
      id: json.data.id,
      token: json.data.token,
      brand: json.data.public_data.brand,
      lastFour: json.data.public_data.last_four,
      expYear: json.data.public_data.exp_year,
      expMonth: json.data.public_data.exp_month,
      cardHolder: json.data.public_data.card_holder,
    }
  }

  // ─── Transactions ────────────────────────────────────────────────────────

  /** Cobra usando una fuente de pago guardada. */
  async charge(options: WompiChargeOptions): Promise<WompiTransaction> {
    const res = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: this.privateHeaders(),
      body: JSON.stringify({
        amount_in_cents: options.amountInCents,
        currency: options.currency,
        customer_email: options.customerEmail,
        reference: options.reference,
        payment_method: {
          type: 'CARD',
          installments: options.installments ?? 1,
          token: options.paymentSourceId,
        },
        redirect_url: options.redirectUrl,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { messages?: Record<string, string[]> } }
      const msg = Object.values(err.error?.messages ?? {}).flat().join(', ') || 'Error procesando cobro'
      throw new WompiError(msg, res.status)
    }

    const json = await res.json() as { data: RawTransaction }
    return mapTransaction(json.data)
  }

  /** Consulta el estado actual de una transacción. */
  async getTransaction(transactionId: string): Promise<WompiTransaction> {
    const res = await fetch(`${this.baseUrl}/transactions/${transactionId}`, {
      headers: this.privateHeaders(),
    })

    if (!res.ok) throw new WompiError('Transacción no encontrada', res.status)

    const json = await res.json() as { data: RawTransaction }
    return mapTransaction(json.data)
  }

  // ─── Webhooks ────────────────────────────────────────────────────────────

  /**
   * Verifica la firma de un webhook de Wompi.
   * Llama desde tu handler POST /api/billing/webhook.
   *
   * @example
   * const raw = await request.text()
   * const sig = request.headers.get('x-event-checksum') ?? ''
   * if (!wompi.verifyWebhookSignature(raw, sig)) {
   *   return unauthorized('Firma inválida')
   * }
   */
  verifyWebhookSignature(rawBody: string, checksum: string): boolean {
    if (!this.eventsSecret) {
      console.warn('[@lynkko/wompi] eventsSecret no configurado — skipping verificación')
      return true
    }

    const event = JSON.parse(rawBody) as WompiWebhookEvent
    const properties = event.signature.properties
    const values = properties.map(p => {
      const parts = p.split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return parts.reduce((obj: any, key) => obj?.[key], event)
    })

    const concatenated = [...values, event.timestamp, this.eventsSecret].join('')
    const expected = createHmac('sha256', this.eventsSecret)
      .update(concatenated)
      .digest('hex')

    return expected === checksum
  }

  // ─── Privados ────────────────────────────────────────────────────────────

  private privateHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.privateKey}`,
    }
  }
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class WompiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'WompiError'
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Crea un cliente Wompi usando variables de entorno.
 *
 * @example
 * // lib/wompi.ts
 * import { createWompiClient } from '@lynkko/wompi'
 * export const wompi = createWompiClient()
 */
export function createWompiClient(config?: {
  publicKey?: string
  privateKey?: string
  eventsSecret?: string
  sandbox?: boolean
}): WompiClient {
  const publicKey = config?.publicKey ?? process.env.WOMPI_PUBLIC_KEY
  const privateKey = config?.privateKey ?? process.env.WOMPI_PRIVATE_KEY
  const eventsSecret = config?.eventsSecret ?? process.env.WOMPI_WEBHOOK_SECRET
  const sandbox = config?.sandbox ?? process.env.WOMPI_SANDBOX === 'true'

  if (!publicKey || !privateKey) {
    throw new Error(
      '[@lynkko/wompi] WOMPI_PUBLIC_KEY y WOMPI_PRIVATE_KEY son requeridas.',
    )
  }

  return new WompiClient(publicKey, privateKey, eventsSecret, sandbox)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convierte pesos COP a centavos para Wompi. */
export function toCents(amountCOP: number): number {
  return Math.round(amountCOP * 100)
}

/** Convierte centavos Wompi a pesos COP. */
export function fromCents(cents: number): number {
  return cents / 100
}

// ─── Internal ────────────────────────────────────────────────────────────────

interface RawTransaction {
  id: string
  status: WompiTransactionStatus
  reference: string
  amount_in_cents: number
  currency: WompiCurrency
  payment_method_type: string
  redirect_url?: string
}

function mapTransaction(raw: RawTransaction): WompiTransaction {
  return {
    id: raw.id,
    status: raw.status,
    reference: raw.reference,
    amountInCents: raw.amount_in_cents,
    currency: raw.currency,
    paymentMethodType: raw.payment_method_type,
    redirectUrl: raw.redirect_url,
  }
}
