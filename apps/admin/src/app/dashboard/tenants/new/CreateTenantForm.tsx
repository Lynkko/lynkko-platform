'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@lynkko/ui'
import { createTenantAction } from './actions'

export function CreateTenantForm() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const id = await createTenantAction(fd)
      if (id) router.push(`/dashboard/tenants/${id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Nombre *</label>
          <Input name="name" placeholder="Ej: Decameron Colombia" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Slug *</label>
          <Input name="slug" placeholder="decameron-colombia" required pattern="[a-z0-9\-]+" />
          <p className="text-xs text-muted-foreground">Identificador único — solo minúsculas, números y guiones</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email de contacto</label>
          <Input name="contactEmail" type="email" placeholder="admin@empresa.com" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Teléfono</label>
          <Input name="contactPhone" type="tel" placeholder="+57 300 000 0000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">País</label>
          <select
            name="country"
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar...</option>
            <option value="Colombia">Colombia</option>
            <option value="México">México</option>
            <option value="Panamá">Panamá</option>
            <option value="Perú">Perú</option>
            <option value="Ecuador">Ecuador</option>
            <option value="Venezuela">Venezuela</option>
            <option value="Chile">Chile</option>
            <option value="Argentina">Argentina</option>
            <option value="España">España</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Estado inicial</label>
          <select
            name="status"
            defaultValue="trial"
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="trial">Trial</option>
            <option value="active">Activo</option>
            <option value="suspended">Suspendido</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Notas internas</label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Información adicional, contexto del cliente..."
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creando...' : 'Crear Tenant'}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
