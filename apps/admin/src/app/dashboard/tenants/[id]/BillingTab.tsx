'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Invoice } from '@lynkko/platform'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@lynkko/ui'
import { createInvoiceAction, markInvoicePaidAction } from '@/app/dashboard/billing/actions'

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
  paid:  { label: 'Pagada',   variant: 'success' },
  open:  { label: 'Abierta',  variant: 'warning' },
  draft: { label: 'Borrador', variant: 'default' },
  void:  { label: 'Anulada',  variant: 'destructive' },
}

function NewInvoiceForm({ tenantId, onDone }: { tenantId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [items, setItems] = useState([{ description: '', unit_price: '', quantity: '1' }])

  function addItem() {
    setItems((prev) => [...prev, { description: '', unit_price: '', quantity: '1' }])
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: string, value: string) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const currency = fd.get('currency') as string || 'COP'
    const notes = fd.get('notes') as string || undefined
    const due_date = fd.get('due_date') as string || undefined

    const invoiceItems = items.map((item) => ({
      description: item.description.trim(),
      unit_price: Number(item.unit_price) || 0,
      quantity: Number(item.quantity) || 1,
    })).filter((item) => item.description && item.unit_price > 0)

    if (invoiceItems.length === 0) return

    startTransition(async () => {
      await createInvoiceAction(tenantId, invoiceItems, { currency, notes, due_date })
      onDone()
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
      <h3 className="text-sm font-semibold text-foreground">Nueva Factura</h3>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Descripción del ítem"
              value={item.description}
              onChange={(e) => updateItem(i, 'description', e.target.value)}
              required
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Precio"
              value={item.unit_price}
              onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
              min="0"
              required
              className="w-28"
            />
            <Input
              type="number"
              placeholder="Cant."
              value={item.quantity}
              onChange={(e) => updateItem(i, 'quantity', e.target.value)}
              min="1"
              className="w-16"
            />
            {items.length > 1 && (
              <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => removeItem(i)}>
                ✕
              </Button>
            )}
          </div>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={addItem}>
          + Agregar ítem
        </Button>
      </div>

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

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
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

export function BillingTab({ invoices, tenantId }: { invoices: Invoice[]; tenantId: string }) {
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
          <NewInvoiceForm tenantId={tenantId} onDone={() => setShowForm(false)} />
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
