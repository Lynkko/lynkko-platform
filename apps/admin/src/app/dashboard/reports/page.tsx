import { platform } from '@/lib/platform'
import { db, platformSchema } from '@/lib/db'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@lynkko/ui'
import { count, eq } from 'drizzle-orm'

export default async function ReportsPage() {
  const [topTenants, allSubs, appAccess] = await Promise.all([
    platform.getTopTenants(10),
    db.select({ c: count() }).from(platformSchema.subscriptions),
    db.select({ c: count() }).from(platformSchema.tenantAppAccess)
      .where(eq(platformSchema.tenantAppAccess.isEnabled, true)),
  ])

  const subsByStatus = await db
    .select({ status: platformSchema.subscriptions.status, c: count() })
    .from(platformSchema.subscriptions)
    .groupBy(platformSchema.subscriptions.status)

  const invoicesByStatus = await db
    .select({ status: platformSchema.invoices.status, c: count() })
    .from(platformSchema.invoices)
    .groupBy(platformSchema.invoices.status)

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Reportes</h1>
      <p className="text-muted-foreground text-sm mb-8">Métricas del ecosistema</p>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Subscriptions by status */}
        <Card>
          <CardHeader><CardTitle>Suscripciones por estado</CardTitle></CardHeader>
          <CardContent className="p-0">
            {subsByStatus.length === 0 ? (
              <p className="px-6 py-6 text-sm text-muted-foreground text-center">Sin datos</p>
            ) : (
              <div className="divide-y divide-border">
                {subsByStatus.map(({ status, c }) => (
                  <div key={status} className="flex items-center justify-between px-6 py-3">
                    <SubStatusBadge status={status} />
                    <span className="text-sm font-medium text-foreground">{c}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices by status */}
        <Card>
          <CardHeader><CardTitle>Facturas por estado</CardTitle></CardHeader>
          <CardContent className="p-0">
            {invoicesByStatus.length === 0 ? (
              <p className="px-6 py-6 text-sm text-muted-foreground text-center">Sin datos</p>
            ) : (
              <div className="divide-y divide-border">
                {invoicesByStatus.map(({ status, c }) => (
                  <div key={status} className="flex items-center justify-between px-6 py-3">
                    <InvStatusBadge status={status} />
                    <span className="text-sm font-medium text-foreground">{c}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* App adoption */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Adopción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total suscripciones</span>
                <span className="font-medium text-foreground">{allSubs[0]?.c ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Apps habilitadas (total)</span>
                <span className="font-medium text-foreground">{appAccess[0]?.c ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top tenants */}
        <Card>
          <CardHeader><CardTitle>Top Tenants por MRR</CardTitle></CardHeader>
          <CardContent className="p-0">
            {topTenants.length === 0 ? (
              <p className="px-6 py-6 text-sm text-muted-foreground text-center">Sin datos de suscripciones</p>
            ) : (
              <div className="divide-y divide-border">
                {topTenants.map((t, i) => (
                  <div key={t.tenantId} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      <div>
                        <p className="text-sm font-mono text-foreground">{t.tenantId}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.subscriptionCount} app{t.subscriptionCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        ${t.mrr.toLocaleString('es-CO')}/mes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SubStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
    active:   { label: 'Activa',    variant: 'success' },
    trialing: { label: 'Trial',     variant: 'warning' },
    past_due: { label: 'Vencida',   variant: 'destructive' },
    canceled: { label: 'Cancelada', variant: 'default' },
    paused:   { label: 'Pausada',   variant: 'default' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}

function InvStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
    paid:  { label: 'Pagada',   variant: 'success' },
    open:  { label: 'Abierta',  variant: 'warning' },
    draft: { label: 'Borrador', variant: 'default' },
    void:  { label: 'Anulada',  variant: 'destructive' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}
