import type { Invoice } from '@lynkko/platform'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@lynkko/ui'

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
  paid:  { label: 'Pagada',   variant: 'success' },
  open:  { label: 'Abierta',  variant: 'warning' },
  draft: { label: 'Borrador', variant: 'default' },
  void:  { label: 'Anulada',  variant: 'destructive' },
}

export function BillingTab({ invoices }: { invoices: Invoice[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturas</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {invoices.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">Sin facturas.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="grid grid-cols-5 gap-4 px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Número</span>
              <span>Estado</span>
              <span>Total</span>
              <span>Vencimiento</span>
              <span>Pagada</span>
            </div>
            {invoices.map((inv) => {
              const { label, variant } = STATUS_MAP[inv.status] ?? { label: inv.status, variant: 'default' }
              return (
                <div key={inv.id} className="grid grid-cols-5 gap-4 px-6 py-4 items-center text-sm">
                  <span className="font-mono text-foreground">{inv.number}</span>
                  <Badge variant={variant}>{label}</Badge>
                  <span className="text-foreground">
                    {inv.currency} {inv.total.toLocaleString('es-CO')}
                  </span>
                  <span className="text-muted-foreground">
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('es-CO') : '—'}
                  </span>
                  <span className="text-muted-foreground">
                    {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('es-CO') : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
