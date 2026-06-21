import { db, platformSchema } from '@/lib/db'
import Link from 'next/link'

export default async function TenantsPage() {
  // Carga todos los tenants únicos del registro de acceso
  const rows = await db
    .selectDistinct({ tenantId: platformSchema.tenantAppAccess.tenantId })
    .from(platformSchema.tenantAppAccess)
    .orderBy(platformSchema.tenantAppAccess.tenantId)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
          <p className="text-slate-500 text-sm mt-1">{rows.length} tenants registrados</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">No hay tenants registrados aún.</p>
          <p className="text-slate-400 text-xs mt-1">Los tenants aparecen aquí cuando se habilita una app para ellos.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {rows.map(({ tenantId }) => (
            <Link
              key={tenantId}
              href={`/dashboard/tenants/${tenantId}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-mono text-slate-700">{tenantId}</span>
              <span className="text-xs text-slate-400">Ver →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
