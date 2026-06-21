import { db, platformSchema } from '@/lib/db'
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

  if (accesses.length === 0) {
    // Tenant sin registros — lo mostramos igual, sin apps activas
  }

  const accessMap = Object.fromEntries(accesses.map((a) => [a.appId, a]))

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-slate-400 mb-1">Tenant</p>
        <h1 className="text-2xl font-bold text-slate-900 font-mono">{tenantId}</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Aplicaciones habilitadas</h2>
          <p className="text-xs text-slate-500 mt-0.5">Controla qué aplicaciones del ecosistema tiene disponibles este tenant</p>
        </div>
        <div className="divide-y divide-slate-100">
          {Object.entries(LYNKKO_APPS).map(([key, appId]) => {
            const access = accessMap[appId]
            return (
              <div key={appId} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">{APP_NAMES[appId] ?? key}</p>
                  <p className="text-xs font-mono text-slate-400">{appId}</p>
                </div>
                <ToggleAppAction tenantId={tenantId} appId={appId} enabled={access?.isEnabled ?? false} />
              </div>
            )
          })}
        </div>
      </div>
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
