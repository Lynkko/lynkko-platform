import { createAnthropic } from '@ai-sdk/anthropic'
import { streamText, generateText, type CoreMessage } from 'ai'

// ─── Types ───────────────────────────────────────────────────────────────────

export type AIPlan = 'free' | 'managed' | 'byok'

export interface CopilotRateLimits {
  /** Requests mensuales para el plan free. Default: 20 */
  free?: number
  /** Requests mensuales para el plan managed. Default: 200 */
  managed?: number
}

export interface CopilotModels {
  /** Modelo para plan free. Default: claude-haiku-4-5-20251001 */
  free?: string
  /** Modelo para plan managed. Default: claude-sonnet-4-6 */
  managed?: string
  /** Modelo para plan byok. Default: claude-sonnet-4-6 */
  byok?: string
}

export interface CopilotConfig {
  plan: AIPlan

  /**
   * API key propia del usuario (solo para plan 'byok').
   * Si no se provee, se usa ANTHROPIC_API_KEY del env.
   */
  byokApiKey?: string

  /**
   * System prompt base. Puede incluir contexto de la app/tenant.
   * @example 'Eres el asistente de ventas de {company}. Responde siempre en español.'
   */
  systemPrompt?: string

  /** Límites de requests mensuales por plan. */
  rateLimits?: CopilotRateLimits

  /** Modelos a usar por plan. */
  models?: CopilotModels

  /** Temperatura del modelo (0-1). Default: 0.7 */
  temperature?: number

  /** Tokens máximos por respuesta. Default: 1024 */
  maxTokens?: number
}

export interface RateLimitResult {
  /** ¿Tiene requests disponibles? */
  allowed:   boolean
  /** Requests restantes (o 'unlimited' para byok). */
  remaining: number | 'unlimited'
  /** Límite total del plan. */
  limit:     number | 'unlimited'
  plan:      AIPlan
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_RATE_LIMITS: Required<CopilotRateLimits> = {
  free:    20,
  managed: 200,
}

const DEFAULT_MODELS: Required<CopilotModels> = {
  free:    'claude-haiku-4-5-20251001',
  managed: 'claude-sonnet-4-6',
  byok:    'claude-sonnet-4-6',
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Crea un copilot configurado para el plan del tenant.
 *
 * @example
 * // src/lib/copilot.ts
 * import { createCopilot } from '@lynkko/ai'
 *
 * export function getCopilot(tenant: { plan: string; byokKey?: string }) {
 *   return createCopilot({
 *     plan: tenant.plan as AIPlan,
 *     byokApiKey: tenant.byokKey,
 *     systemPrompt: `Eres el asistente de ventas de ${tenant.name}. Responde en español.`,
 *   })
 * }
 *
 * // app/api/ai/chat/route.ts
 * export async function POST(req: Request) {
 *   const { messages, monthlyUsage } = await req.json()
 *   const copilot = getCopilot(ctx.tenant)
 *
 *   const { allowed } = copilot.checkRateLimit(monthlyUsage)
 *   if (!allowed) return conflict('Límite de AI alcanzado para tu plan')
 *
 *   const result = copilot.streamChat(messages)
 *   return result.toDataStreamResponse()
 * }
 */
export function createCopilot(config: CopilotConfig) {
  const limits = {
    free:    config.rateLimits?.free    ?? DEFAULT_RATE_LIMITS.free,
    managed: config.rateLimits?.managed ?? DEFAULT_RATE_LIMITS.managed,
  }

  const models = {
    free:    config.models?.free    ?? DEFAULT_MODELS.free,
    managed: config.models?.managed ?? DEFAULT_MODELS.managed,
    byok:    config.models?.byok    ?? DEFAULT_MODELS.byok,
  }

  function getModel() {
    const apiKey = config.byokApiKey ?? process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('[@lynkko/ai] ANTHROPIC_API_KEY requerido.')

    const anthropic = createAnthropic({ apiKey })
    const modelId = models[config.plan]
    return anthropic(modelId)
  }

  return {
    /**
     * Verifica si el tenant tiene requests disponibles este mes.
     * El conteo actual debe provenir de tu DB (no lo gestiona este paquete).
     *
     * @param monthlyUsage - Requests usados en el mes actual
     * @example
     * const usage = await db.select({ count: count() }).from(aiUsage)
     *   .where(and(eq(aiUsage.tenantId, ctx.tenantId), gte(aiUsage.createdAt, startOfMonth)))
     *
     * const { allowed, remaining } = copilot.checkRateLimit(usage[0].count)
     */
    checkRateLimit(monthlyUsage: number): RateLimitResult {
      if (config.plan === 'byok') {
        return { allowed: true, remaining: 'unlimited', limit: 'unlimited', plan: 'byok' }
      }

      const limit     = limits[config.plan]
      const remaining = Math.max(0, limit - monthlyUsage)
      const allowed   = monthlyUsage < limit

      return { allowed, remaining, limit, plan: config.plan }
    },

    /**
     * Stream de chat — retornar directamente desde el Route Handler.
     *
     * @example
     * const result = copilot.streamChat(messages)
     * return result.toDataStreamResponse()
     */
    streamChat(
      messages: CoreMessage[],
      options?: { maxTokens?: number; temperature?: number },
    ) {
      return streamText({
        model:       getModel(),
        system:      config.systemPrompt,
        messages,
        maxTokens:   options?.maxTokens   ?? config.maxTokens   ?? 1024,
        temperature: options?.temperature ?? config.temperature ?? 0.7,
      })
    },

    /**
     * Generación no-streaming — útil para tareas en background o Server Actions.
     *
     * @example
     * const { text } = await copilot.generateText(messages)
     */
    async generateText(
      messages: CoreMessage[],
      options?: { maxTokens?: number; temperature?: number },
    ) {
      return generateText({
        model:       getModel(),
        system:      config.systemPrompt,
        messages,
        maxTokens:   options?.maxTokens   ?? config.maxTokens   ?? 1024,
        temperature: options?.temperature ?? config.temperature ?? 0.7,
      })
    },

    /** Plan activo del copilot. */
    plan: config.plan as AIPlan,

    /** Límites configurados (para mostrar en UI). */
    limits,

    /** Modelo que se usará para el plan activo. */
    modelId: models[config.plan],
  }
}

export type Copilot = ReturnType<typeof createCopilot>

// ─── Re-exports útiles de AI SDK ─────────────────────────────────────────────

export type { CoreMessage } from 'ai'
