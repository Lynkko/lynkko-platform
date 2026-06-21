import type { SubscriptionWithPlan, AppPlan, LynkkoAppId } from '@lynkko/platform'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@lynkko/ui'
import { AddSubscriptionForm } from './AddSubscriptionForm'
import { CancelSubscriptionButton } from './CancelSubscriptionButton'

interface AppPlanGroup {
  appId: LynkkoAppId
  appName: string
  plans: AppPlan[]
}

interface Props {
  tenantId:          string
  subscriptions:     SubscriptionWithPlan[]
  availableAppPlans: AppPlanGroup[]
}

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
  active:    { label: 'Activa',      variant: 'success' },
  trialing:  { label: 'Trial',       variant: 'warning' },
  past_due:  { label: 'Vencida',     variant: 'destructive' },
  canceled:  { label: 'Cancelada',   variant: 'default' },
  paused:    { label: 'Pausada',     variant: 'default' },
}

export function SubscriptionsTab({ tenantId, subscriptions, availableAppPlans }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suscripciones</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {subscriptions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">Sin suscripciones activas.</p>
            <AddSubscriptionForm tenantId={tenantId} availableAppPlans={availableAppPlans} />
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {subscriptions.map((sub) => {
                const { label, variant } = STATUS_MAP[sub.status] ?? { label: sub.status, variant: 'default' }
                return (
                  <div key={sub.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-foreground">{sub.plan.name}</p>
                        <Badge variant={variant}>{label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{sub.appId}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sub.seats} seat{sub.seats !== 1 ? 's' : ''} ·{' '}
                        {sub.plan.currency} {sub.plan.monthlyPrice.toLocaleString('es-CO')}/mes ·{' '}
                        vence {new Date(sub.currentPeriodEnd).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    {sub.status !== 'canceled' && (
                      <CancelSubscriptionButton tenantId={tenantId} subscriptionId={sub.id} />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="px-6 py-4 border-t border-border">
              <AddSubscriptionForm tenantId={tenantId} availableAppPlans={availableAppPlans} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
