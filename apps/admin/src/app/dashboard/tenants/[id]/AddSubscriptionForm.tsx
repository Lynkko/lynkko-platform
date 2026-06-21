'use client'

import { useState, useTransition } from 'react'
import { Button } from '@lynkko/ui'
import { addSubscriptionAction } from './actions'
import type { LynkkoAppId, AppPlan } from '@lynkko/platform'

interface AppPlanGroup {
  appId: LynkkoAppId
  appName: string
  plans: AppPlan[]
}

interface Props {
  tenantId: string
  availableAppPlans: AppPlanGroup[]
}

export function AddSubscriptionForm({ tenantId, availableAppPlans }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState('')
  const [isPending, startTransition] = useTransition()

  const selectedGroup = availableAppPlans.find((g) => g.appId === selectedAppId)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const appId  = fd.get('appId')  as LynkkoAppId
    const planId = fd.get('planId') as string
    const seats  = Number(fd.get('seats')) || 1

    startTransition(async () => {
      await addSubscriptionAction(tenantId, appId, planId, seats)
      setShowForm(false)
      setSelectedAppId('')
    })
  }

  if (availableAppPlans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todas las apps disponibles ya tienen suscripción.
      </p>
    )
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-sm text-primary hover:underline"
      >
        + Agregar suscripción
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border border-border rounded-md bg-muted/30 space-y-4">
      <p className="text-sm font-medium text-foreground">Nueva suscripción</p>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Aplicación</label>
          <select
            name="appId"
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            required
            className="w-full h-9 px-2 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar app...</option>
            {availableAppPlans.map((g) => (
              <option key={g.appId} value={g.appId}>{g.appName}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Plan</label>
          <select
            name="planId"
            required
            disabled={!selectedGroup || selectedGroup.plans.length === 0}
            className="w-full h-9 px-2 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            <option value="">
              {!selectedGroup ? 'Primero selecciona app' : selectedGroup.plans.length === 0 ? 'Sin planes' : 'Seleccionar plan...'}
            </option>
            {selectedGroup?.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.currency} {p.monthlyPrice.toLocaleString('es-CO')}/mes
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Seats</label>
          <input
            name="seats"
            type="number"
            min="1"
            defaultValue="1"
            className="w-full h-9 px-2 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Creando...' : 'Crear suscripción'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
