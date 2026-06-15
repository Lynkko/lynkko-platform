// ─── Types ───────────────────────────────────────────────────────────────────

/** Valor de un límite: número finito o 'unlimited'. */
export type LimitValue = number | 'unlimited'

/** Mapa de feature → límite para un plan. */
export type PlanLimits = Record<string, LimitValue>

export interface PlanPrice {
  monthly:  number
  annual?:  number
  currency: 'COP' | 'USD'
}

export interface Plan {
  /** Identificador único del plan. Ej: 'free' | 'starter' | 'pro' | 'enterprise' */
  id: string
  /** Nombre visible. */
  name: string
  /**
   * Orden relativo para comparaciones (mayor número = plan más alto).
   * Ej: free=0, starter=1, pro=2, enterprise=3
   */
  tier: number
  description?: string
  /** Mapa de feature → límite. */
  features: PlanLimits
  price?: PlanPrice
}

export interface LimitCheckResult {
  /** ¿El uso actual está dentro del límite? */
  allowed:   boolean
  /** Límite del plan para la feature. */
  limit:     LimitValue
  /** Cantidad restante antes del límite (o 'unlimited'). */
  remaining: LimitValue
  /** Porcentaje de uso (0-100). 0 si el límite es 'unlimited'. */
  percent:   number
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Define un plan con tipado estricto. Funciona como identity pero sirve
 * para documentar y garantizar la forma del objeto.
 *
 * @example
 * export const FREE_PLAN = definePlan({
 *   id: 'free', name: 'Gratis', tier: 0,
 *   features: { leads: 100, users: 1, ai_requests: 20 },
 * })
 */
export function definePlan(plan: Plan): Plan {
  return plan
}

// ─── Utilidades de límites ───────────────────────────────────────────────────

/**
 * Obtiene el valor del límite de una feature en el plan.
 * Retorna 0 si la feature no está definida (sin acceso).
 */
export function getLimit(plan: Plan, feature: string): LimitValue {
  const value = plan.features[feature]
  return value !== undefined ? value : 0
}

/**
 * Verifica si el uso actual está dentro del límite del plan.
 *
 * @example
 * if (!isWithinLimit(plan, 'leads', currentLeadCount)) {
 *   return conflict('Límite de leads alcanzado para tu plan')
 * }
 */
export function isWithinLimit(plan: Plan, feature: string, usage: number): boolean {
  const limit = getLimit(plan, feature)
  if (limit === 'unlimited') return true
  return usage < limit
}

/**
 * Revisa el límite con detalle completo: cuánto queda, porcentaje de uso, etc.
 *
 * @example
 * const check = checkFeatureLimit(plan, 'leads', 87)
 * // { allowed: true, limit: 100, remaining: 13, percent: 87 }
 *
 * if (!check.allowed) return conflict(`Límite de leads alcanzado (${check.limit})`)
 * if (check.percent >= 90) sendLimitWarningEmail(user)
 */
export function checkFeatureLimit(
  plan: Plan,
  feature: string,
  currentUsage: number,
): LimitCheckResult {
  const limit = getLimit(plan, feature)

  if (limit === 'unlimited') {
    return { allowed: true, limit: 'unlimited', remaining: 'unlimited', percent: 0 }
  }

  const allowed   = currentUsage < limit
  const remaining = Math.max(0, limit - currentUsage)
  const percent   = limit > 0 ? Math.min(100, Math.round((currentUsage / limit) * 100)) : 100

  return { allowed, limit, remaining, percent }
}

// ─── Comparación de planes ────────────────────────────────────────────────────

/**
 * Compara dos planes por tier.
 * Retorna -1 (planA < planB), 0 (iguales), 1 (planA > planB).
 *
 * @example
 * plans.sort((a, b) => comparePlans(a, b))  // ascendente
 */
export function comparePlans(planA: Plan, planB: Plan): -1 | 0 | 1 {
  if (planA.tier < planB.tier) return -1
  if (planA.tier > planB.tier) return 1
  return 0
}

/** ¿planA tiene mayor tier que planB? */
export function isHigherPlan(planA: Plan, planB: Plan): boolean {
  return planA.tier > planB.tier
}

/** ¿El plan tiene acceso a la feature (límite > 0 o unlimited)? */
export function hasFeatureAccess(plan: Plan, feature: string): boolean {
  const limit = getLimit(plan, feature)
  return limit === 'unlimited' || limit > 0
}

// ─── PlanRegistry ─────────────────────────────────────────────────────────────

/**
 * Registro singleton de planes de la app. Permite recuperar planes por ID
 * y compararlos sin depender de constantes hardcoded en cada módulo.
 *
 * @example
 * // src/lib/plans.ts
 * import { PlanRegistry, definePlan } from '@lynkko/billing'
 *
 * export const plans = new PlanRegistry()
 *
 * plans.register(
 *   definePlan({ id: 'free',       name: 'Gratis',       tier: 0, features: { leads: 100, users: 1 } }),
 *   definePlan({ id: 'starter',    name: 'Starter',      tier: 1, features: { leads: 500, users: 3 } }),
 *   definePlan({ id: 'pro',        name: 'Pro',          tier: 2, features: { leads: 'unlimited', users: 10 } }),
 *   definePlan({ id: 'enterprise', name: 'Enterprise',   tier: 3, features: { leads: 'unlimited', users: 'unlimited' } }),
 * )
 *
 * // En un Route Handler:
 * const plan = plans.get(tenant.plan) ?? plans.getLowest()
 * if (!isWithinLimit(plan, 'leads', leadsCount)) return conflict('...')
 */
export class PlanRegistry {
  private readonly registry = new Map<string, Plan>()

  register(...plans: Plan[]): this {
    for (const plan of plans) this.registry.set(plan.id, plan)
    return this
  }

  get(id: string): Plan | undefined {
    return this.registry.get(id)
  }

  getOrThrow(id: string): Plan {
    const plan = this.registry.get(id)
    if (!plan) throw new Error(`[@lynkko/billing] Plan '${id}' no encontrado en el registro.`)
    return plan
  }

  getAll(): Plan[] {
    return Array.from(this.registry.values())
  }

  /** Planes ordenados de menor a mayor tier. */
  getOrdered(): Plan[] {
    return this.getAll().sort(comparePlans)
  }

  getHighest(): Plan {
    const ordered = this.getOrdered()
    if (ordered.length === 0) throw new Error('[@lynkko/billing] No hay planes registrados.')
    return ordered[ordered.length - 1]
  }

  getLowest(): Plan {
    const ordered = this.getOrdered()
    if (ordered.length === 0) throw new Error('[@lynkko/billing] No hay planes registrados.')
    return ordered[0]
  }

  has(id: string): boolean {
    return this.registry.has(id)
  }

  size(): number {
    return this.registry.size
  }
}
