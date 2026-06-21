import { db, platformSchema } from '@/lib/db'

export default async function AppsPage() {
  const apps = await db.select().from(platformSchema.platformApps).orderBy(platformSchema.platformApps.id)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Aplicaciones</h1>
        <p className="text-slate-500 text-sm mt-1">Registro global de apps del ecosistema Lynkko</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {apps.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-400">No hay apps registradas.</p>
            <p className="text-xs text-slate-400 mt-1">Ejecuta la migración SQL inicial para sembrar el registro.</p>
          </div>
        ) : (
          apps.map((app) => (
            <div key={app.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{app.name}</p>
                <p className="text-xs font-mono text-slate-400">{app.id}</p>
                {app.description && <p className="text-xs text-slate-400 mt-0.5">{app.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                {app.url && (
                  <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline">
                    {app.url}
                  </a>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  app.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {app.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
