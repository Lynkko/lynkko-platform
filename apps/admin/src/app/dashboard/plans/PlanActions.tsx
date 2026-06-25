'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@lynkko/ui'
import { updatePlanAction, deletePlanAction } from './actions'

type Plan = {
  id: string
  name: string
  slug: string
  description: string | null
  billingModel: string
  currency: string
  monthlyPrice: number
  annualPrice: number
  pricePerSeat: number
  maxSeats: number | null
  sortOrder: number
  features: string[] | null
  limits: Record<string, number> | null
  isPublic: boolean
  isActive: boolean
}

export function PlanActions({ plan }: { plan: Plan }) {
  const [mode, setMode] = useState<'idle' | 'edit' | 'delete'>('idle')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await updatePlanAction(plan.id, fd)
      setMode('idle')
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deletePlanAction(plan.id)
      router.refresh()
    })
  }

  if (mode === 'delete') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive">¿Eliminar?</span>
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={handleDelete}
        >
          {isPending ? 'Eliminando...' : 'Sí, eliminar'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>
          Cancelar
        </Button>
      </div>
    )
  }

  if (mode === 'edit') {
    return (
      <form onSubmit={handleEdit} className="border border-border rounded-lg p-4 mt-2 space-y-3 bg-muted/30">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nombre</label>
            <Input name="name" defaultValue={plan.name} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Descripción</label>
            <Input name="description" defaultValue={plan.description ?? ''} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Modelo de cobro</label>
          <select
            name="billingModel"
            defaultValue={plan.billingModel}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="flat">Tarifa fija</option>
            <option value="per_seat">Por usuario</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Precio/mes</label>
            <Input name="monthlyPrice" type="number" min="0" defaultValue={plan.monthlyPrice} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Precio/año</label>
            <Input name="annualPrice" type="number" min="0" defaultValue={plan.annualPrice} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Precio/usuario</label>
            <Input name="pricePerSeat" type="number" min="0" defaultValue={plan.pricePerSeat} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Máx. seats</label>
          <Input name="maxSeats" type="number" min="1" defaultValue={plan.maxSeats ?? ''} placeholder="Ilimitado" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Orden</label>
            <Input name="sortOrder" type="number" min="0" defaultValue={plan.sortOrder} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Features (una por línea)</label>
          <textarea
            name="features"
            rows={3}
            defaultValue={(plan.features ?? []).join('\n')}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Límites (JSON)</label>
          <textarea
            name="limits"
            rows={2}
            defaultValue={plan.limits ? JSON.stringify(plan.limits, null, 2) : ''}
            placeholder={'{"max_establishments": 1, "max_advisors": 3}'}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isPublic" defaultChecked={plan.isPublic} className="rounded" />
            <span>Público</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isActive" defaultChecked={plan.isActive} className="rounded" />
            <span>Activo</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode('idle')}>
            Cancelar
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" onClick={() => setMode('edit')}>
        Editar
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setMode('delete')}>
        Eliminar
      </Button>
    </div>
  )
}
