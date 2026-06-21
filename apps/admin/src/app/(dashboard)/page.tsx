import { db, platformSchema } from '@/lib/db'
import { count } from 'drizzle-orm'

export default async function DashboardPage() {
  const [appsCount, tenantsCount] = await Promise.all([
    db.select({ c: count() }).from(platformSchema.platformApps),
    db.select({ c: count() }).from(platformSchema.tenantAppAccess),
  ])

  const stats = [
    { label: 'Aplicaciones registradas', value: appsCount[0]?.c ?? 0 },
    { label: 'Accesos de tenant', value: tenantsCount[0]?.c ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Lynkko Platform</h1>
      <p className="text-slate-500 text-sm mb-8">Centro de control del ecosistema</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Ecosistema Lynkko</h2>
        <div className="grid grid-cols-3 gap-3">
          {ECOSYSTEM_APPS.map(({ id, name, status }) => (
            <div key={id} className="rounded-lg border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-slate-400">{id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  status === 'live' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {status === 'live' ? 'Live' : 'Pendiente'}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-800">{name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ECOSYSTEM_APPS = [
  { id: 'pec',        name: 'Lynkko App',        status: 'live' },
  { id: 'turnflow',   name: 'Turnflow',           status: 'live' },
  { id: 'clubpass',   name: 'ClubPass',           status: 'live' },
  { id: 'incentivos', name: 'Lynkko Incentivos',  status: 'live' },
  { id: 'customer',   name: 'Lynkko Customer',    status: 'pending' },
  { id: 'help',       name: 'Lynkko Help',        status: 'pending' },
  { id: 'facturacion',name: 'Lynkko Facturación', status: 'pending' },
] as const
