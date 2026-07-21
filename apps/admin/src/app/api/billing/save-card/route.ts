/**
 * POST /api/billing/save-card   — guarda una tarjeta para cobro automático.
 * DELETE /api/billing/save-card  — elimina la tarjeta guardada.
 *
 * El navegador tokeniza la tarjeta directo con Wompi (nunca pasa por este server);
 * aquí recibimos solo el token de un-solo-uso + el email, creamos un payment_source
 * reusable en Wompi y guardamos su id en payment_methods (por defecto). El cron
 * `process-payments` cobra las facturas abiertas contra ese source.
 *
 * Autenticación: token de sesión firmado del portal (verifySession), no cookie.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, platformSchema } from '@/lib/db'
import { verifySession } from '@/lib/billing-portal'
import { createPaymentSource } from '@/lib/wompi'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const session = body?.session ? verifySession(body.session) : null
  if (!session) return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 })
  const tenantId = session.tenantId

  const cardToken = body?.cardToken as string | undefined
  const email = (body?.email as string | undefined)?.trim()
  if (!cardToken || !email) {
    return NextResponse.json({ error: 'Faltan datos de la tarjeta' }, { status: 400 })
  }

  let source
  try {
    source = await createPaymentSource(cardToken, email)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 })
  }

  // La nueva tarjeta pasa a ser la predeterminada; las demás dejan de serlo.
  await db
    .update(platformSchema.paymentMethods)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(platformSchema.paymentMethods.tenantId, tenantId))

  // Preferir la marca/último-4/vencimiento que la tokenización devolvió al cliente
  // (Wompi no siempre los expone en el payment_source → antes quedaba "CARD"/null).
  const brand = (body?.brand as string | undefined)?.toUpperCase() || source.brand
  const last4 = (body?.last4 as string | undefined) || source.last4
  const expMonth = (body?.expMonth as string | undefined) || source.expMonth
  const expYear = (body?.expYear as string | undefined) || source.expYear
  const expiresAt =
    expMonth && expYear
      ? new Date(Number(`20${String(expYear).slice(-2)}`), Number(expMonth), 0)
      : null

  await db.insert(platformSchema.paymentMethods).values({
    tenantId,
    type: 'CARD',
    brand,
    lastFour: last4,
    token: source.id,
    isDefault: true,
    isActive: true,
    expiresAt,
  })

  return NextResponse.json({
    ok: true,
    card: { brand, last4, holder: source.holder },
  })
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const session = body?.session ? verifySession(body.session) : null
  if (!session) return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 })

  await db
    .update(platformSchema.paymentMethods)
    .set({ isActive: false, isDefault: false, updatedAt: new Date() })
    .where(
      and(
        eq(platformSchema.paymentMethods.tenantId, session.tenantId),
        eq(platformSchema.paymentMethods.isActive, true),
      ),
    )

  return NextResponse.json({ ok: true })
}
