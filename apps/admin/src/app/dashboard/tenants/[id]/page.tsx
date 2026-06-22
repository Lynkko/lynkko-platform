import { db, platformSchema } from '@/lib/db'
import { platform } from '@/lib/platform'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@lynkko/ui'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LYNKKO_APPS, type LynkkoAppId, type AppPlan } from '@lynkko/platform'
import { ToggleAppAction } from './ToggleAppAction'
import { TabNav } from './TabNav'
import { SubscriptionsTab } from './SubscriptionsTab'
import { BillingTab } from './BillingTab'
import { UsageTab } from './UsageTab'
import { BrandTab } from './BrandTab'
import { ModulesTab } from './ModulesTab'

interface Props {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

const APP_NAMES: Record<string, string> = {
  pec:        'Lynkko App (PEC)',
  turnflow:   'Turnflow by Lynkko',
  clubpass:   'ClubPass by Lynkko',
  incentivos: 'Lynkko Incentivos',
  pqrs:       'Lynkko PQRS',
  help:       'Lynkko Help',
}

export default async function TenantDetailPage({ params, searchParams }: Props) {
  const { id }  = await params
  const { tab } = await searchParams
  const activeTab = tab ?? 'apps'

  // Try to load from tenants table first, fall back to raw tenantId from app access
  const tenant = await platform.getTenant(id)
  const tenantId = tenant?.id ?? id   // use the UUID as tenantId

  const accesses = await db
    .select()
    .from(platformSchema.tenantAppAccess)
    .where(eq(platformSchema.tenantAppAccess.tenantId, tenantId))

  if (!tenant && accesses.length === 0) notFound()

  // Fetch modules
  const allModules = await db
    .select()
    .from(platformSchema.platformModules)

  const moduleAccesses = await db
    .select()
    .from(platformSchema.tenantModuleAccess)
    .where(eq(platformSchema.tenantModuleAccess.tenantId, tenantId))

  // Data needed per tab (fetch only what's active)
  const [subscriptions, invoices, usageRecords, allPlans] = await Promise.all([
    activeTab === 'subscriptions' || activeTab === 'apps'
      ? platform.listSubscriptions(tenantId)
      : Promise.resolve([]),
    activeTab === 'billing'
      ? platform.listInvoices(tenantId)
      : Promise.resolve([]),
    activeTab === 'usage'
      ? platform.getUsageSummary(tenantId)
      : Promise.resolve([]),
    activeTab === 'subscriptions'
      ? platform.listPlans()
      : Promise.resolve([]),
  ])

  // Build app+plan groups for apps that don't yet have a subscription
  const subscribedAppIds = new Set(subscriptions.map((s) => s.appId))
  const plansByApp = allPlans.reduce<Record<string, AppPlan[]>>((acc, p) => {
    if (!acc[p.appId]) acc[p.appId] = []
    acc[p.appId].push(p)
    return acc
  }, {})
  const availableAppPlans = Object.values(LYNKKO_APPS)
    .filter((appId) => !subscribedAppIds.has(appId))
    .map((appId) => ({
      appId,
      appName: APP_NAMES[appId] ?? appId,
      plans:   plansByApp[appId] ?? [],
    }))

  const accessMap = Object.fromEntries(accesses.map((a) => [a.appId, a]))

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/tenants" className="text-sm text-muted-foreground hover:text-foreground">
          ← Tenants
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {tenant?.name ?? id}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {tenant && (
                <>
                  <span className="text-xs font-mono text-muted-foreground">{tenant.slug}</span>
                  {tenant.country && <span className="text-xs text-muted-foreground">{tenant.country}</span>}
                  <StatusBadge status={tenant.status} />
                </>
              )}
            </div>
          </div>
          {tenant && (
            <div className="text-right text-xs text-muted-foreground">
              <p>Creado: {new Date(tenant.createdAt).toLocaleDateString('es-CO')}</p>
              {tenant.contactEmail && <p>{tenant.contactEmail}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <TabNav activeTab={activeTab} />

      {/* Tab content */}
      {activeTab === 'apps' && (
        <Card>
          <CardHeader>
            <CardTitle>Aplicaciones habilitadas</CardTitle>
            <CardDescription>
              Controla qué aplicaciones del ecosistema tiene disponibles este tenant
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {Object.entries(LYNKKO_APPS).map(([key, appId]) => {
                const access = accessMap[appId]
                const sub    = subscriptions.find((s) => s.appId === appId)
                return (
                  <div key={appId} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{APP_NAMES[appId] ?? key}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-muted-foreground">{appId}</span>
                        {sub && (
                          <span className="text-xs text-muted-foreground">· {sub.plan.name}</span>
                        )}
                      </div>
                    </div>
                    <ToggleAppAction tenantId={tenantId} appId={appId as LynkkoAppId} enabled={access?.isEnabled ?? false} />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'modules' && (
        <div className="space-y-6">
          {Object.values(LYNKKO_APPS).map((appId) => {
            const appModules = allModules.filter((m) => m.appId === appId)
            if (appModules.length === 0) return null

            return (
              <ModulesTab
                key={appId}
                tenantId={tenantId}
                appId={appId}
                appName={APP_NAMES[appId] ?? appId}
                modules={appModules}
                accesses={moduleAccesses}
              />
            )
          })}
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <SubscriptionsTab
          tenantId={tenantId}
          subscriptions={subscriptions}
          availableAppPlans={availableAppPlans}
        />
      )}

      {activeTab === 'billing' && (
        <BillingTab invoices={invoices} />
      )}

      {activeTab === 'usage' && (
        <UsageTab records={usageRecords} />
      )}

      {activeTab === 'brand' && (
        <BrandTab tenantId={tenantId} accesses={accesses} />
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
