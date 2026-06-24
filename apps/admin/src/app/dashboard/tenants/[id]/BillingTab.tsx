'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Invoice, SubscriptionWithPlan } from '@lynkko/platform'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@lynkko/ui'
import { createInvoiceAction, markInvoicePaidAction } from '@/app/dashboard/billing/actions'

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
  paid:  { label: 'Pagada',   variant: 'success' },
  open:  { label: 'Abierta',  variant: 'warning' },
  draft: { label: 'Borrador', variant: 'default' },
  void:  { label: 'Anulada',  variant: 'destructive' },
}

function NewInvoiceForm({
  tenantId,
  subscriptions,
  onDone,
}: {
  tenantId: string
  subscriptions: SubscriptionWithPlan[]
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [selectedSubs, setSelectedSubs] = useState<string[]>([])

  function toggleSub(id: string) {
    setSelectedSubs((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const currency = fd.get('currency') as string || 'COP'
    const due_date = fd.get('due_date') as string || undefined
    const notes    = fd.get('notes') as string || undefined

    const items = subscriptions
      .filter((s) => selectedSubs.includes(s.id))
      .map((s) => ({
        description:     `${s.plan.name} — ${s.appId} (${s.seats} seat${s.seats !== 1 ? 's' : ''})`,
        subscription_id: s.id,
        unit_price:      s.plan.monthlyPrice,
        quantity:        1,
      }))

    if (items.length === 0) return

    startTransition(async () => {
      await createInvoiceAction(tenantId, items, { currency, due_date, notes })
      onDone()
      router.refresh()
    })
  }

  const total = subscriptions
    .filter((s) => selectedSubs.includes(s.id))
    .reduce((sum, s) => sum + s.plan.monthlyPrice, 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
      <h3 className="text-sm font-semibold text-foreground">Nueva Factura</h3>

      {subscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este tenant no tiene suscripciones activas.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Suscripciones a facturar</p>
          {subscriptions.map((s) => (
            <label
              key={s.id}
              className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                selectedSubs.includes(s.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedSubs.includes(s.id)}
                  onChange={() => toggleSub(s.id)}
                  className="rounded"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{s.plan.name}</p>
                  <p className="text-xs text-muted-foreground">{s.appId} · {s.seats} seat{s.seats !== 1 ? 's' : ''} · {s.status}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-foreground">
                {s.plan.currency} {s.plan.monthlyPrice.toLocaleString('es-CO')}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Moneda</label>
          <select
            name="currency"
            defaultValue="COP"
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Vencimiento</label>
          <Input name="due_date" type="date" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Notas</label>
          <Input name="notes" placeholder="Opcional" />
        </div>
      </div>

      {selectedSubs.length > 0 && (
        <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground">{selectedSubs.length} suscripción{selectedSubs.length !== 1 ? 'es' : ''}</span>
          <span className="text-sm font-semibold text-foreground">
            COP {total.toLocaleString('es-CO')}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending || selectedSubs.length === 0}>
          {isPending ? 'Creando...' : 'Crear Factura'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-xs"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markInvoicePaidAction(invoiceId)
          router.refresh()
        })
      }
    >
      {isPending ? '...' : 'Marcar pagada'}
    </Button>
  )
}

export function BillingTab({
  invoices,
  tenantId,
  subscriptions,
}: {
  invoices: Invoice[]
  tenantId: string
  subscriptions: SubscriptionWithPlan[]
}) {
  const [showForm, setShowForm] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Facturas</CardTitle>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              Nueva Factura
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <NewInvoiceForm
            tenantId={tenantId}
            subscriptions={subscriptions}
            onDone={() => setShowForm(false)}
          />
        )}

        {invoices.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Sin facturas.</p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-6 gap-4 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/30">
              <span>Número</span>
              <span>Estado</span>
              <span>Total</span>
              <span>Vencimiento</span>
              <span>Pagada</span>
              <span />
            </div>
            {invoices.map((inv) => {
              const { label, variant } = STATUS_MAP[inv.status] ?? { label: inv.status, variant: 'default' }
              return (
                <div key={inv.id} className="grid grid-cols-6 gap-4 px-4 py-3 items-center text-sm">
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
                  <span>
                    {inv.status === 'open' && <MarkPaidButton invoiceId={inv.id} />}
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
