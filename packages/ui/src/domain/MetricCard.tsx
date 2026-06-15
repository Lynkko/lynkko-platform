import { type ReactNode } from 'react'
import { cn } from '../utils'

export interface MetricCardProps {
  label:       string
  value:       string | number
  /** Variación respecto al período anterior. Ej: '+12%' o '-3%' */
  change?:     string
  /** true = positivo (verde), false = negativo (rojo), undefined = neutro */
  positive?:   boolean
  icon?:       ReactNode
  className?:  string
  /** Texto de pie de card. Ej: 'vs. mes anterior' */
  footer?:     string
}

/**
 * Tarjeta de métrica para dashboards.
 *
 * @example
 * <MetricCard
 *   label="Prospectos nuevos"
 *   value={142}
 *   change="+18%"
 *   positive={true}
 *   footer="vs. mes anterior"
 *   icon={<UsersIcon className="h-4 w-4" />}
 * />
 */
export function MetricCard({ label, value, change, positive, icon, className, footer }: MetricCardProps) {
  return (
    <div className={cn(
      'rounded-lg border border-border bg-card p-6 shadow-sm',
      className,
    )}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {change && (
          <span className={cn(
            'mb-0.5 text-xs font-medium',
            positive === true  && 'text-green-600',
            positive === false && 'text-red-600',
            positive === undefined && 'text-muted-foreground',
          )}>
            {change}
          </span>
        )}
      </div>
      {footer && <p className="mt-1 text-xs text-muted-foreground">{footer}</p>}
    </div>
  )
}
