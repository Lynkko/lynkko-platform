import { platform } from '@/lib/platform'
import { db, platformSchema } from '@/lib/db'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@lynkko/ui'
import { count, eq } from 'drizzle-orm'

export default async function BillingPage() {
  const [mrr, activeSubs, pendingInvoices, recentInvoices, tenants] = await Promise.all([
    platform.getMRR(),
    db.select({ c: count() }).from(platformSchema.subscriptions)
      .where(eq(platformSchema.subscriptions.status, 'active')),
    db.select({ c: count() }).from(platformSchema.invoices)
      .where(eq(platformSchema.invoices.status, 'open')),
    db.select().from(platformSchema.invoices)
      .orderBy(platformSchema.invoices.createdAt)
      .limit(20),
    platform.getTopTenants(5),
  ])

  const stats = [
    { label: 'MRR',                  value: formatCOP(mrr) },
    { label: 'Suscripciones activas', value: activeSubs[0]?.c ?? 0 },
    { label: 'Facturas pendientes',   value: pendingInvoices[0]?.c ?? 0 },
    { label: 'ARR estimado',          value: formatCOP(mrr * 12) },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Billing</h1>
      <p className="text-muted-foreground text-sm mb-8">Resumen de facturación y suscripciones</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <Card>
            <CardHeader><CardTitle>Facturas recientes</CardTitle></CardHeader>
            <CardContent className="p-0">
              {recentInvoices.length === 0 ? (
                <p className="px-6 py-8 text-sm text-muted-foreground text-center">Sin facturas</p>
              ) : (
                <>
                  <div className="grid grid-cols-5 gap-4 px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
                    <span>Número</span>
                    <span>Tenant</span>
                    <span>Estado</span>
                    <span>Total</span>
                    <span>Fecha</span>
                  </div>
                  <div className="divide-y divide-border">
                    {recentInvoices.map((inv) => (
                      <div key={inv.id} className="grid grid-cols-5 gap-4 px-6 py-3 items-center text-sm">
                        <span className="font-mono text-foreground">{inv.number}</span>
                        <span className="text-muted-foreground truncate">{inv.tenantId}</span>
                        <InvoiceBadge status={inv.status} />
                        <span className="text-foreground">
                          {inv.currency} {inv.total.toLocaleString('es-CO')}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2">
          <Card>
            <CardHeader><CardTitle>Top Tenants por MRR</CardTitle></CardHeader>
            <CardContent className="p-0">
              {tenants.length === 0 ? (
                <p className="px-6 py-8 text-sm text-muted-foreground text-center">Sin datos</p>
              ) : (
                <div className="divide-y divide-border">
                  {tenants.map((t, i) => (
                    <div key={t.tenantId} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <div>
                          <p className="text-sm font-mono text-foreground">{t.tenantId}</p>
                          <p className="text-xs text-muted-foreground">{t.subscriptionCount} suscripción{t.subscriptionCount !== 1 ? 'es' : ''}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-foreground">{formatCOP(t.mrr)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InvoiceBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
    paid:  { label: 'Pagada',   variant: 'success' },
    open:  { label: 'Abierta',  variant: 'warning' },
    draft: { label: 'Borrador', variant: 'default' },
    void:  { label: 'Anulada',  variant: 'destructive' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}

function formatCOP(n: number): string {
  if (n === 0) return '$0'
  return '$' + n.toLocaleString('es-CO')
}
