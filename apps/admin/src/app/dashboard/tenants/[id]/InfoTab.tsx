'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@lynkko/ui'
import { updateTenantAction } from './actions'

interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  country: string | null
  notes: string | null
}

export function InfoTab({ tenant }: { tenant: Tenant }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await updateTenantAction(tenant.id, fd)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del tenant</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nombre del negocio *</label>
              <Input name="name" defaultValue={tenant.name} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Estado</label>
              <select
                name="status"
                defaultValue={tenant.status}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="trial">Trial</option>
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
                <option value="churned">Churned</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Persona de contacto</label>
            <Input
              name="contactName"
              defaultValue={tenant.contactName ?? ''}
              placeholder="Nombre completo del contacto"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email de contacto</label>
              <Input
                name="contactEmail"
                type="email"
                defaultValue={tenant.contactEmail ?? ''}
                placeholder="contacto@empresa.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Teléfono</label>
              <Input
                name="contactPhone"
                defaultValue={tenant.contactPhone ?? ''}
                placeholder="+57 300 000 0000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">País</label>
            <Input
              name="country"
              defaultValue={tenant.country ?? ''}
              placeholder="CO"
              maxLength={2}
              className="uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notas internas</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={tenant.notes ?? ''}
              placeholder="Observaciones, contexto de la cuenta..."
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="pt-1">
            <p className="text-xs text-muted-foreground mb-3">
              Slug: <span className="font-mono">{tenant.slug}</span> · ID: <span className="font-mono text-xs">{tenant.id}</span>
            </p>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
