import { platform } from '@/lib/platform'
import { Badge, Card } from '@lynkko/ui'
import Link from 'next/link'

export default async function TenantsPage() {
  const tenants = await platform.listTenants()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
          <p className="text-muted-foreground text-sm mt-1">{tenants.length} tenants registrados</p>
        </div>
        <Link
          href="/dashboard/tenants/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
        >
          + Nuevo Tenant
        </Link>
      </div>

      {tenants.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm">No hay tenants registrados aún.</p>
            <Link href="/dashboard/tenants/new" className="text-primary text-sm mt-2 inline-block hover:underline">
              Crear el primer tenant →
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {tenants.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/dashboard/tenants/${tenant.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{tenant.name}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{tenant.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  {tenant.country && (
                    <span className="text-xs text-muted-foreground">{tenant.country}</span>
                  )}
                  <StatusBadge status={tenant.status} />
                  <span className="text-xs text-muted-foreground">Ver →</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
    active:    { label: 'Activo',     variant: 'success' },
    trial:     { label: 'Trial',      variant: 'warning' },
    suspended: { label: 'Suspendido', variant: 'destructive' },
    churned:   { label: 'Churned',    variant: 'default' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}
