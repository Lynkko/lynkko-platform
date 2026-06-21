'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@lynkko/ui'
import { createPlanAction } from './actions'
import type { PlatformApp } from '@lynkko/platform'

export function NewPlanForm({ apps }: { apps: PlatformApp[] }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await createPlanAction(fd)
      ;(e.target as HTMLFormElement).reset()
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Aplicación *</label>
        <select
          name="appId"
          required
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Seleccionar app...</option>
          {apps.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Nombre *</label>
          <Input name="name" placeholder="Pro" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Slug *</label>
          <Input name="slug" placeholder="pro" required pattern="[a-z0-9\-]+" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Descripción</label>
        <Input name="description" placeholder="Para equipos medianos" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Moneda</label>
          <select
            name="currency"
            defaultValue="COP"
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="COP">COP</option>
            <option value="USD">USD</option>
            <option value="MXN">MXN</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Precio/mes *</label>
          <Input name="monthlyPrice" type="number" min="0" placeholder="150000" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Precio/año</label>
          <Input name="annualPrice" type="number" min="0" placeholder="1500000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Máx. seats</label>
          <Input name="maxSeats" type="number" min="1" placeholder="Ilimitado" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Orden</label>
          <Input name="sortOrder" type="number" min="0" defaultValue="0" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Features (una por línea)</label>
        <textarea
          name="features"
          rows={3}
          placeholder="Pipeline ilimitado&#10;Reportes avanzados&#10;API access"
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="isPublic" defaultChecked className="rounded" />
          <span className="text-foreground">Público</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="isActive" defaultChecked className="rounded" />
          <span className="text-foreground">Activo</span>
        </label>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Creando...' : 'Crear Plan'}
      </Button>
    </form>
  )
}
