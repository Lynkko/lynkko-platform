/**
 * Wompi Payment Integration
 * https://developer.wompi.co/
 */

const WOMPI_API_URL = process.env.WOMPI_API_URL || 'https://api.wompi.co'
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY!
const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY!

export interface WompiTransaction {
  reference: string
  amountInCents: number
  currency: string
  customerEmail: string
  customerName: string
  paymentMethod: {
    type: 'CARD'
    token: string
  }
  redirectUrl?: string
  metadata?: Record<string, any>
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
 * Process a payment with Wompi
 */
export async function processPayment(transaction: WompiTransaction): Promise<WompiResponse> {
  try {
    const response = await fetch(`${WOMPI_API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WOMPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: transaction.reference,
        amount_in_cents: transaction.amountInCents,
        currency: transaction.currency,
        customer_email: transaction.customerEmail,
        customer_name: transaction.customerName,
        payment_method: transaction.paymentMethod,
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
    const response = await fetch(`${WOMPI_API_URL}/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WOMPI_PRIVATE_KEY}`,
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
    const response = await fetch(`${WOMPI_API_URL}/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          number: card.cardNumber,
          exp_month: card.expiryMonth,
          exp_year: card.expiryYear,
          cvc: card.cvv,
          card_holder: card.cardholderName,
        },
        public_key: WOMPI_PUBLIC_KEY,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Wompi tokenization error:', data)
      return null
    }

    return {
      token: data.data?.id,
    }
  } catch (error) {
    console.error('Wompi tokenization error:', error)
    return null
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
