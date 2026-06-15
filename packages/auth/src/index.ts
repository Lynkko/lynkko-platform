import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as authTables from './schema'

// ─── Re-exports ──────────────────────────────────────────────────────────────

export { toNextJsHandler } from 'better-auth/next-js'
export { authSchema, user, session, account, verification } from './schema'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LynkkoAuthConfig {
  /**
   * Instancia de Drizzle que contiene las tablas de auth.
   * El schema del db debe incluir authSchema de '@lynkko/auth/schema'.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: Record<string, any>

  /** JWT secret. Default: process.env.AUTH_SECRET */
  secret?: string

  /** URL base de la app. Default: process.env.NEXT_PUBLIC_APP_URL */
  baseUrl?: string

  /** Nombre de la app mostrado en emails de Better Auth. Default: 'Lynkko' */
  appName?: string

  emailAndPassword?: {
    enabled?: boolean
    /** Default: false */
    requireEmailVerification?: boolean
    sendResetPassword?: (
      data: { token: string; url: string; user: { email: string; name: string } },
      req?: Request,
    ) => Promise<void>
    sendVerificationEmail?: (
      data: { user: { email: string; name: string }; url: string; token: string },
      req?: Request,
    ) => Promise<void>
  }

  socialProviders?: {
    google?: {
      /** Default: process.env.GOOGLE_CLIENT_ID */
      clientId?: string
      /** Default: process.env.GOOGLE_CLIENT_SECRET */
      clientSecret?: string
    }
  }

  session?: {
    /** Duración de la sesión en segundos. Default: 30 días */
    expiresIn?: number
    /** Intervalo de renovación en segundos. Default: 1 día */
    updateAge?: number
  }

  /** URLs adicionales que pueden hacer requests a la API de auth. */
  trustedOrigins?: string[]
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Crea una instancia de Better Auth lista para usar en Next.js.
 *
 * @example
 * // src/lib/auth.ts
 * import { createAuth } from '@lynkko/auth'
 * import { db } from './db'  // db con authSchema incluido
 *
 * export const auth = createAuth({ db })
 * export type Session = typeof auth.$Infer.Session
 * export type User = typeof auth.$Infer.Session.user
 *
 * // app/api/auth/[...all]/route.ts
 * import { auth } from '@/lib/auth'
 * import { toNextJsHandler } from '@lynkko/auth'
 * export const { GET, POST } = toNextJsHandler(auth)
 */
export function createAuth(config: LynkkoAuthConfig) {
  const secret  = config.secret  ?? process.env.AUTH_SECRET
  const baseUrl = config.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL

  if (!secret)  throw new Error('[@lynkko/auth] AUTH_SECRET requerido. Defínelo en variables de entorno o en createAuth({ secret }).')
  if (!baseUrl) throw new Error('[@lynkko/auth] NEXT_PUBLIC_APP_URL requerido. Defínelo en variables de entorno o en createAuth({ baseUrl }).')

  // Social providers — solo incluir los que tienen credenciales
  const socialProviders: Parameters<typeof betterAuth>[0]['socialProviders'] = {}
  if (config.socialProviders?.google) {
    const id     = config.socialProviders.google.clientId     ?? process.env.GOOGLE_CLIENT_ID
    const secret = config.socialProviders.google.clientSecret ?? process.env.GOOGLE_CLIENT_SECRET
    if (id && secret) socialProviders.google = { clientId: id, clientSecret: secret }
  }

  return betterAuth({
    database: drizzleAdapter(config.db, {
      provider: 'pg',
      schema: authTables,
    }),

    secret,
    baseURL: baseUrl,
    appName: config.appName ?? 'Lynkko',

    trustedOrigins: config.trustedOrigins ?? [baseUrl],

    session: {
      expiresIn: config.session?.expiresIn ?? 60 * 60 * 24 * 30, // 30 días
      updateAge: config.session?.updateAge ?? 60 * 60 * 24,       // 1 día
    },

    emailAndPassword: {
      enabled: config.emailAndPassword?.enabled ?? true,
      requireEmailVerification: config.emailAndPassword?.requireEmailVerification ?? false,
      ...(config.emailAndPassword?.sendResetPassword && {
        sendResetPassword: config.emailAndPassword.sendResetPassword,
      }),
      ...(config.emailAndPassword?.sendVerificationEmail && {
        sendVerificationEmail: config.emailAndPassword.sendVerificationEmail,
      }),
    },

    ...(Object.keys(socialProviders).length > 0 && { socialProviders }),
  })
}

/** Tipo de la instancia de auth. Usar para tipar parámetros en funciones. */
export type LynkkoAuth = ReturnType<typeof createAuth>
