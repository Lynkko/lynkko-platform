import { db, platformSchema } from '@/lib/db'
import { Card } from '@lynkko/ui'
import { AppToggles } from './AppToggles'

export default async function AppsPage() {
  const apps = await db.select().from(platformSchema.platformApps).orderBy(platformSchema.platformApps.id)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Aplicaciones</h1>
        <p className="text-muted-foreground text-sm mt-1">Registro global de apps del ecosistema Lynkko</p>
      </div>

      <Card>
        {apps.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No hay apps registradas.</p>
            <p className="text-xs text-muted-foreground mt-1">Ejecuta la migración SQL inicial para sembrar el registro.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {apps.map((app) => (
              <div key={app.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{app.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{app.id}</p>
                  {app.description && <p className="text-xs text-muted-foreground mt-0.5">{app.description}</p>}
                  {app.url && (
                    <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      {app.url}
                    </a>
                  )}
                </div>
                <AppToggles app={{ id: app.id, isActive: app.isActive, showInMarketplace: app.showInMarketplace }} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
