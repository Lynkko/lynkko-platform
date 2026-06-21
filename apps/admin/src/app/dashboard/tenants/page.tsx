import { db, platformSchema } from '@/lib/db'
import { Card } from '@lynkko/ui'
import Link from 'next/link'

export default async function TenantsPage() {
  const rows = await db
    .selectDistinct({ tenantId: platformSchema.tenantAppAccess.tenantId })
    .from(platformSchema.tenantAppAccess)
    .orderBy(platformSchema.tenantAppAccess.tenantId)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
          <p className="text-muted-foreground text-sm mt-1">{rows.length} tenants registrados</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm">No hay tenants registrados aún.</p>
            <p className="text-muted-foreground text-xs mt-1">Los tenants aparecen aquí cuando se habilita una app para ellos.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {rows.map(({ tenantId }) => (
              <Link
                key={tenantId}
                href={`/dashboard/tenants/${tenantId}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted transition-colors"
              >
                <span className="text-sm font-mono text-foreground">{tenantId}</span>
                <span className="text-xs text-muted-foreground">Ver →</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
