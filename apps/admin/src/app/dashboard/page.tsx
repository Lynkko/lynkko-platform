import { db, platformSchema } from '@/lib/db'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@lynkko/ui'
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
      <h1 className="text-2xl font-bold text-foreground mb-1">Lynkko Platform</h1>
      <p className="text-muted-foreground text-sm mb-8">Centro de control del ecosistema</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ecosistema Lynkko</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {ECOSYSTEM_APPS.map(({ id, name, status }) => (
              <div key={id} className="rounded-md border border-border p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{id}</span>
                  <Badge variant={status === 'live' ? 'success' : 'warning'}>
                    {status === 'live' ? 'Live' : 'Pendiente'}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground">{name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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
