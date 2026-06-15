import { cn } from '../utils'

export type PlanTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise' | 'custom'

const PLAN_STYLES: Record<PlanTier, string> = {
  free:       'bg-slate-100 text-slate-600 border-slate-200',
  starter:    'bg-blue-50 text-blue-700 border-blue-200',
  pro:        'bg-violet-50 text-violet-700 border-violet-200',
  business:   'bg-amber-50 text-amber-700 border-amber-200',
  enterprise: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  custom:     'bg-primary/10 text-primary border-primary/20',
}

const PLAN_LABEL: Record<PlanTier, string> = {
  free:       'Free',
  starter:    'Starter',
  pro:        'Pro',
  business:   'Business',
  enterprise: 'Enterprise',
  custom:     'Custom',
}

export interface PlanBadgeProps {
  plan:        PlanTier | string
  /** Muestra un ícono de corona para planes pagos. Default: true */
  showIcon?:   boolean
  className?:  string
}

/**
 * Badge visual del plan activo de un tenant.
 *
 * @example
 * <PlanBadge plan="pro" />
 * <PlanBadge plan={tenant.plan} showIcon={false} />
 */
export function PlanBadge({ plan, showIcon = true, className }: PlanBadgeProps) {
  const tier    = plan as PlanTier
  const isPaid  = tier !== 'free'
  const style   = PLAN_STYLES[tier] ?? PLAN_STYLES.custom
  const label   = PLAN_LABEL[tier]  ?? plan

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
      style,
      className,
    )}>
      {showIcon && isPaid && (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden>
          <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      )}
      {label}
    </span>
  )
}
