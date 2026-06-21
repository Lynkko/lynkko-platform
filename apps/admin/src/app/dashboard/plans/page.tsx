import { platform } from '@/lib/platform'
import { db, platformSchema } from '@/lib/db'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@lynkko/ui'
import { NewPlanForm } from './NewPlanForm'

export default async function PlansPage() {
  const [plans, apps] = await Promise.all([
    platform.listPlans(),
    db.select().from(platformSchema.platformApps),
  ])

  const plansByApp = plans.reduce<Record<string, typeof plans>>((acc, p) => {
    if (!acc[p.appId]) acc[p.appId] = []
    acc[p.appId].push(p)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planes</h1>
          <p className="text-muted-foreground text-sm mt-1">{plans.length} planes en el catálogo</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-4">
          {apps.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay apps registradas</CardContent></Card>
          ) : apps.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{app.name}</CardTitle>
                  <span className="text-xs font-mono text-muted-foreground">{app.id}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(plansByApp[app.id] ?? []).length === 0 ? (
                  <p className="px-6 py-4 text-sm text-muted-foreground">Sin planes configurados</p>
                ) : (
                  <div className="divide-y divide-border">
                    {(plansByApp[app.id] ?? []).map((plan) => (
                      <div key={plan.id} className="flex items-center justify-between px-6 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{plan.name}</p>
                            <Badge variant={plan.isActive ? 'success' : 'default'}>
                              {plan.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
                            {!plan.isPublic && (
                              <Badge variant="default">Privado</Badge>
                            )}
                          </div>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">{plan.slug}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {plan.currency} {plan.monthlyPrice.toLocaleString('es-CO')}/mes
                          </p>
                          {plan.annualPrice > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {plan.currency} {plan.annualPrice.toLocaleString('es-CO')}/año
                            </p>
                          )}
                          {plan.maxSeats && (
                            <p className="text-xs text-muted-foreground">Máx. {plan.maxSeats} seats</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nuevo Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <NewPlanForm apps={apps} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
