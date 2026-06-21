import { db, platformSchema } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@lynkko/ui'
import { eq } from 'drizzle-orm'
import { ToggleAppAction } from './ToggleAppAction'
import { LYNKKO_APPS } from '@lynkko/platform'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TenantDetailPage({ params }: Props) {
  const { id: tenantId } = await params

  const accesses = await db
    .select()
    .from(platformSchema.tenantAppAccess)
    .where(eq(platformSchema.tenantAppAccess.tenantId, tenantId))

  const accessMap = Object.fromEntries(accesses.map((a) => [a.appId, a]))

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">Tenant</p>
        <h1 className="text-2xl font-bold text-foreground font-mono">{tenantId}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aplicaciones habilitadas</CardTitle>
          <CardDescription>Controla qué aplicaciones del ecosistema tiene disponibles este tenant</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {Object.entries(LYNKKO_APPS).map(([key, appId]) => {
              const access = accessMap[appId]
              return (
                <div key={appId} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{APP_NAMES[appId] ?? key}</p>
                    <p className="text-xs font-mono text-muted-foreground">{appId}</p>
                  </div>
                  <ToggleAppAction tenantId={tenantId} appId={appId} enabled={access?.isEnabled ?? false} />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const APP_NAMES: Record<string, string> = {
  pec:        'Lynkko App (PEC)',
  turnflow:   'Turnflow by Lynkko',
  clubpass:   'ClubPass by Lynkko',
  incentivos: 'Lynkko Incentivos',
  customer:   'Lynkko Customer',
  help:       'Lynkko Help',
  facturacion:'Lynkko Facturación',
}
