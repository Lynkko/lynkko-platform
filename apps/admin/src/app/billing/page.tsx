/**
 * Portal de cobro tenant-facing: /billing?session=<token>
 * El tenant (sin cuenta en platform) llega con un link firmado desde su app.
 * Ve su plan + facturas abiertas y paga con el Web Checkout de Wompi (PCI-safe,
 * sin manejar datos de tarjeta en el servidor). Al volver, verifica la transacción
 * y marca la factura pagada.
 */
import { db, platformSchema } from '@/lib/db'
import { and, eq, desc } from 'drizzle-orm'
import { verifySession, integritySignature } from '@/lib/billing-portal'
import { getTransactionStatus } from '@/lib/wompi'
import { SaveCardForm } from './SaveCardForm'

export const dynamic = 'force-dynamic'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://platform.lynkko.co').trim().replace(/\/+$/, '')
const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY ?? ''
const WOMPI_API_URL = (process.env.WOMPI_API_URL ?? 'https://sandbox.wompi.co/v1').replace(/\/+$/, '')
const CHECKOUT_URL = 'https://checkout.wompi.co/p/'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#f6f7fb', fontFamily: 'system-ui,sans-serif', color: '#1b1e28' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>{children}</div>
    </main>
  )
}

export default async function BillingPortal({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; id?: string; invoice?: string }>
}) {
  const sp = await searchParams
  const session = sp.session ? verifySession(sp.session) : null

  if (!session) {
    return (
      <Shell>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Enlace inválido o expirado</h1>
        <p style={{ color: '#6a7086', marginTop: 8 }}>Vuelve a tu aplicación y abre de nuevo “Gestionar plan”.</p>
      </Shell>
    )
  }
  const tenantId = session.tenantId

  // Retorno de Wompi: verificar transacción y marcar la factura pagada (idempotente).
  let paidNotice: string | null = null
  if (sp.id && sp.invoice) {
    try {
      const tx = await getTransactionStatus(sp.id)
      const status = tx.data?.status
      if (status === 'APPROVED') {
        await db.update(platformSchema.invoices)
          .set({ status: 'paid', paidAt: new Date(), wompiTransactionId: sp.id, updatedAt: new Date() })
          .where(and(eq(platformSchema.invoices.id, sp.invoice), eq(platformSchema.invoices.tenantId, tenantId)))
        paidNotice = '¡Pago aprobado! Tu factura quedó marcada como pagada.'
      } else if (status) {
        paidNotice = `El pago quedó en estado "${status}". Si fue rechazado, intenta con otra tarjeta.`
      }
    } catch {
      paidNotice = 'No pudimos confirmar el pago automáticamente. Si se realizó, se reflejará en breve.'
    }
  }

  const [tenant] = await db.select({ name: platformSchema.tenants.name })
    .from(platformSchema.tenants).where(eq(platformSchema.tenants.id, tenantId)).limit(1)

  const subs = await db.select({
      status: platformSchema.subscriptions.status,
      appId: platformSchema.subscriptions.appId,
      planName: platformSchema.appPlans.name,
      planPrice: platformSchema.appPlans.monthlyPrice,
      planCurrency: platformSchema.appPlans.currency,
    })
    .from(platformSchema.subscriptions)
    .leftJoin(platformSchema.appPlans, eq(platformSchema.subscriptions.planId, platformSchema.appPlans.id))
    .where(eq(platformSchema.subscriptions.tenantId, tenantId))

  const invoices = await db.select()
    .from(platformSchema.invoices)
    .where(and(eq(platformSchema.invoices.tenantId, tenantId), eq(platformSchema.invoices.status, 'open')))
    .orderBy(desc(platformSchema.invoices.createdAt))

  const [savedCard] = await db.select({ brand: platformSchema.paymentMethods.brand, last4: platformSchema.paymentMethods.lastFour })
    .from(platformSchema.paymentMethods)
    .where(and(
      eq(platformSchema.paymentMethods.tenantId, tenantId),
      eq(platformSchema.paymentMethods.isActive, true),
      eq(platformSchema.paymentMethods.isDefault, true),
    ))
    .limit(1)

  const fmt = (n: number, c: string) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#5145e6', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>L</div>
        <div><div style={{ fontWeight: 700 }}>Lynkko</div><div style={{ fontSize: 12, color: '#6a7086' }}>Facturación</div></div>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{tenant?.name ?? 'Tu cuenta'}</h1>

      {paidNotice && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: '#e9f9ef', border: '1px solid #b7e6c6', color: '#12a150', fontSize: 14 }}>
          {paidNotice}
        </div>
      )}

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6a7086', fontWeight: 700 }}>Tu plan</h2>
        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
          {subs.length === 0 && <div style={{ color: '#6a7086', fontSize: 14 }}>Sin suscripciones activas.</div>}
          {subs.map((s, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e3e6ef', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 650 }}>{s.planName ?? 'Plan'} <span style={{ color: '#9aa0b2', fontWeight: 400 }}>· {s.appId}</span></div>
                <div style={{ fontSize: 13, color: '#6a7086' }}>{s.planPrice ? `${fmt(s.planPrice, s.planCurrency ?? 'COP')}/mes` : 'Gratis'}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: s.status === 'active' ? '#e9f9ef' : '#f1f2f6', color: s.status === 'active' ? '#12a150' : '#6a7086' }}>{s.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6a7086', fontWeight: 700 }}>Facturas por pagar</h2>
        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
          {invoices.length === 0 && <div style={{ color: '#6a7086', fontSize: 14 }}>No tienes facturas pendientes. 🎉</div>}
          {invoices.map((inv) => {
            const amountInCents = Math.round(Number(inv.total) * 100)
            const reference = inv.number
            const sig = integritySignature(reference, amountInCents, inv.currency)
            const redirectUrl = `${APP_URL}/billing?session=${encodeURIComponent(sp.session ?? '')}&invoice=${inv.id}`
            return (
              <div key={inv.id} style={{ background: '#fff', border: '1px solid #e3e6ef', borderRadius: 12, padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 650, fontFamily: 'ui-monospace,monospace' }}>{inv.number}</div>
                  <div style={{ fontSize: 13, color: '#6a7086' }}>{fmt(Number(inv.total), inv.currency)}</div>
                </div>
                <form action={CHECKOUT_URL} method="GET">
                  <input type="hidden" name="public-key" value={WOMPI_PUBLIC_KEY} />
                  <input type="hidden" name="currency" value={inv.currency} />
                  <input type="hidden" name="amount-in-cents" value={amountInCents} />
                  <input type="hidden" name="reference" value={reference} />
                  <input type="hidden" name="signature:integrity" value={sig} />
                  <input type="hidden" name="redirect-url" value={redirectUrl} />
                  <button type="submit" style={{ background: '#5145e6', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Pagar</button>
                </form>
              </div>
            )
          })}
        </div>
      </section>

      {WOMPI_PUBLIC_KEY && sp.session && (
        <SaveCardForm
          publicKey={WOMPI_PUBLIC_KEY}
          wompiBase={WOMPI_API_URL}
          sessionToken={sp.session}
          existingCard={savedCard ? { brand: savedCard.brand ?? 'CARD', last4: savedCard.last4 ?? '****' } : null}
        />
      )}

      <p style={{ marginTop: 28, fontSize: 12, color: '#9aa0b2', textAlign: 'center' }}>Pagos procesados de forma segura por Wompi.</p>
    </Shell>
  )
}
