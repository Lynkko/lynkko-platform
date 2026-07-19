/**
 * POST /api/billing/test-charge — verificación sandbox del cobro Wompi (Fase 1).
 * Protegido por CRON_SECRET. Tokeniza la tarjeta de prueba de Wompi (4242…),
 * hace un cobro y consulta el estado. NO escribe en la DB — solo prueba que la
 * integración Wompi (llaves + acceptance token + charge) funciona end-to-end.
 * Temporal: se remueve al montar el flujo real de cobro.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { tokenizePaymentMethod, processPayment, getTransactionStatus } from '@/lib/wompi'

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 1) tokenizar tarjeta de prueba sandbox (APROBADA en Wompi test)
  const tok = await tokenizePaymentMethod({
    cardNumber: '4242424242424242',
    expiryMonth: '12',
    expiryYear: '29',
    cvv: '123',
    cardholderName: 'QA Lynkko',
  })
  if (!tok?.token) {
    return NextResponse.json({ step: 'tokenize', ok: false, note: 'no token — revisar WOMPI_PUBLIC_KEY' })
  }

  // 2) cobrar (COP: amount_in_cents = valor * 100). 59.500 COP → 5.950.000
  const reference = `qa-test-${Date.now()}`
  const charge = await processPayment({
    reference,
    amountInCents: 5_950_000,
    currency: 'COP',
    customerEmail: 'qa@lynkko.co',
    customerName: 'QA Lynkko',
    paymentMethod: { type: 'CARD', token: tok.token },
  })

  const txId = charge.data?.id
  let status = charge.data?.status ?? null

  // 3) las tx de Wompi son asíncronas: consultar el estado tras un momento
  if (txId) {
    await new Promise((r) => setTimeout(r, 4000))
    const s = await getTransactionStatus(txId)
    status = s.data?.status ?? status
  }

  return NextResponse.json({
    tokenized: Boolean(tok.token),
    transactionId: txId ?? null,
    status,
    errors: charge.errors ?? null,
  })
}
