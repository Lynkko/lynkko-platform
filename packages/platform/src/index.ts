import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { and, eq } from 'drizzle-orm'

// ─── Apps registradas en el ecosistema Lynkko ─────────────────────────────────

export const LYNKKO_APPS = {
  PEC:        'pec',         // Plataforma de Éxito Comercial (Lynkko App)
  TURNFLOW:   'turnflow',    // Gestión de turnos y citas
  CLUBPASS:   'clubpass',    // Membresías y lealtad hotelera
  INCENTIVOS: 'incentivos',  // Gamificación B2B2C para brokers
  PQRS:       'pqrs',        // PQRS y posventa
  HELP:       'help',        // Centros de ayuda multi-tenant
} as const

export type LynkkoAppId = typeof LYNKKO_APPS[keyof typeof LYNKKO_APPS]

// ─── Tema visual de una app por tenant ───────────────────────────────────────

export interface AppTheme {
  /** Color primario en hex. Ej: '#166534' */
  primary:     string
  /** Color secundario en hex. Ej: '#0f172a' */
  secondary?:  string
  /** Color de acento en hex. Ej: '#facc15' */
  accent?:     string
  /** Nombre personalizado de la app para este tenant. */
  appName?:    string
  /** URL del logo (PNG/SVG). */
  logoUrl?:    string
  /** URL del favicon. */
  faviconUrl?: string
  /** Radio de bordes: 'none' | 'sm' | 'md' | 'lg' | 'full'. Default: 'md' */
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * Registro global de aplicaciones del ecosistema Lynkko.
 * Gestionado desde el superadmin de platform.
 */
export const platformApps = pgTable('platform_apps', {
  id:          text('id').primaryKey(),  // = LynkkoAppId ('pec', 'turnflow'…)
  name:        text('name').notNull(),
  description: text('description'),
  url:         text('url'),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
})

/**
 * Módulos disponibles dentro de cada app.
 * Ej: en PEC → 'leads', 'pipeline', 'quotations', 'reports'
 */
export const platformModules = pgTable('platform_modules', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  appId:       text('app_id').notNull().references(() => platformApps.id, { onDelete: 'cascade' }),
  slug:        text('slug').notNull(),   // Ej: 'leads', 'pipeline', 'reports'
  name:        text('name').notNull(),
  description: text('description'),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('platform_module_app_slug_idx').on(t.appId, t.slug),
])

/**
 * Acceso de un tenant a una app del ecosistema.
 * Incluye tema visual y config específica del tenant para esa app.
 */
export const tenantAppAccess = pgTable('tenant_app_access', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:  text('tenant_id').notNull(),
  appId:     text('app_id').notNull().references(() => platformApps.id, { onDelete: 'cascade' }),
  isEnabled: boolean('is_enabled').notNull().default(false),
  /** Tema visual del tenant para esta app. */
  theme:     jsonb('theme').$type<AppTheme>(),
  /** Config adicional: plan, seats, custom features… */
  config:    jsonb('config').$type<Record<string, unknown>>(),
  enabledAt: timestamp('enabled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('tenant_app_idx').on(t.tenantId, t.appId),
  index('tenant_app_tenant_idx').on(t.tenantId),
])

/**
 * Acceso de un tenant a un módulo específico dentro de una app.
 */
export const tenantModuleAccess = pgTable('tenant_module_access', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:  text('tenant_id').notNull(),
  appId:     text('app_id').notNull(),
  moduleId:  text('module_id').notNull().references(() => platformModules.id, { onDelete: 'cascade' }),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('tenant_module_idx').on(t.tenantId, t.moduleId),
  index('tenant_module_tenant_idx').on(t.tenantId, t.appId),
])

export type PlatformApp       = typeof platformApps.$inferSelect
export type PlatformModule    = typeof platformModules.$inferSelect
export type TenantAppAccess   = typeof tenantAppAccess.$inferSelect
export type TenantModuleAccess = typeof tenantModuleAccess.$inferSelect

export const platformSchema = { platformApps, platformModules, tenantAppAccess, tenantModuleAccess }

// ─── SDK ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

export interface TenantAppSummary {
  appId:     LynkkoAppId
  isEnabled: boolean
  theme?:    AppTheme
  config?:   Record<string, unknown>
}

export interface PlatformClient {
  /**
   * Verifica si un tenant tiene habilitada una app del ecosistema.
   *
   * @example
   * // middleware.ts
   * const allowed = await platform.isAppEnabled(tenantId, 'turnflow')
   * if (!allowed) return redirect('/upgrade')
   */
  isAppEnabled(tenantId: string, appId: LynkkoAppId): Promise<boolean>

  /**
   * Verifica si un módulo específico está habilitado para un tenant.
   *
   * @example
   * const canSeeReports = await platform.isModuleEnabled(tenantId, 'pec', 'reports')
   */
  isModuleEnabled(tenantId: string, appId: LynkkoAppId, moduleSlug: string): Promise<boolean>

  /**
   * Obtiene el tema visual del tenant para una app.
   * Retorna null si el tenant no tiene acceso o no ha configurado tema.
   *
   * @example
   * // app/layout.tsx
   * const theme = await platform.getAppTheme(tenantId, 'pec')
   * // <ThemeProvider theme={theme}>...</ThemeProvider>
   */
  getAppTheme(tenantId: string, appId: LynkkoAppId): Promise<AppTheme | null>

  /**
   * Lista todas las apps habilitadas para un tenant.
   *
   * @example
   * const apps = await platform.getTenantApps(tenantId)
   * // [{ appId: 'pec', isEnabled: true, theme: {...} }, ...]
   */
  getTenantApps(tenantId: string): Promise<TenantAppSummary[]>

  /**
   * Habilita una app para un tenant (desde el superadmin).
   *
   * @example
   * await platform.enableApp(tenantId, 'turnflow', {
   *   theme: { primary: '#1e40af', appName: 'Mi Turnero' },
   * })
   */
  enableApp(tenantId: string, appId: LynkkoAppId, config?: { theme?: AppTheme; config?: Record<string, unknown> }): Promise<void>

  /**
   * Deshabilita una app para un tenant.
   */
  disableApp(tenantId: string, appId: LynkkoAppId): Promise<void>

  /**
   * Actualiza el tema visual del tenant para una app.
   *
   * @example
   * await platform.updateTheme(tenantId, 'pec', {
   *   primary: '#7c3aed',
   *   appName: 'Ventas Pro',
   * })
   */
  updateTheme(tenantId: string, appId: LynkkoAppId, theme: AppTheme): Promise<void>

  /**
   * Habilita o deshabilita un módulo para un tenant dentro de una app.
   *
   * @example
   * await platform.setModuleAccess(tenantId, 'pec', 'reports', false)
   */
  setModuleAccess(tenantId: string, appId: LynkkoAppId, moduleSlug: string, enabled: boolean): Promise<void>
}

/**
 * Crea el SDK del platform para gestionar accesos y temas.
 *
 * @example
 * // src/lib/platform.ts
 * import { createPlatformClient } from '@lynkko/platform'
 * import { db } from './db'
 *
 * export const platform = createPlatformClient(db)
 *
 * // middleware.ts
 * const allowed = await platform.isAppEnabled(tenantId, 'turnflow')
 *
 * // app/layout.tsx
 * const theme = await platform.getAppTheme(tenantId, 'pec')
 */
export function createPlatformClient(db: AnyDb): PlatformClient {
  async function getAccess(tenantId: string, appId: string) {
    const [row] = await db
      .select()
      .from(tenantAppAccess)
      .where(and(
        eq(tenantAppAccess.tenantId, tenantId),
        eq(tenantAppAccess.appId,    appId),
      ))
      .limit(1)
    return row as TenantAppAccess | undefined
  }

  return {
    async isAppEnabled(tenantId, appId) {
      const row = await getAccess(tenantId, appId)
      return row?.isEnabled ?? false
    },

    async isModuleEnabled(tenantId, appId, moduleSlug) {
      const appEnabled = await this.isAppEnabled(tenantId, appId)
      if (!appEnabled) return false

      const [module] = await db
        .select({ id: platformModules.id })
        .from(platformModules)
        .where(and(
          eq(platformModules.appId, appId),
          eq(platformModules.slug,  moduleSlug),
        ))
        .limit(1)

      if (!module) return false

      const [access] = await db
        .select()
        .from(tenantModuleAccess)
        .where(and(
          eq(tenantModuleAccess.tenantId,  tenantId),
          eq(tenantModuleAccess.moduleId,  module.id),
        ))
        .limit(1)

      // Si no hay registro explícito, asumimos que el módulo está habilitado
      return access ? access.isEnabled : true
    },

    async getAppTheme(tenantId, appId) {
      const row = await getAccess(tenantId, appId)
      if (!row?.isEnabled) return null
      return (row.theme as AppTheme) ?? null
    },

    async getTenantApps(tenantId) {
      const rows = await db
        .select()
        .from(tenantAppAccess)
        .where(eq(tenantAppAccess.tenantId, tenantId))
      return rows.map((r: TenantAppAccess) => ({
        appId:     r.appId as LynkkoAppId,
        isEnabled: r.isEnabled,
        theme:     r.theme as AppTheme | undefined,
        config:    r.config as Record<string, unknown> | undefined,
      }))
    },

    async enableApp(tenantId, appId, opts) {
      await db
        .insert(tenantAppAccess)
        .values({
          tenantId,
          appId,
          isEnabled: true,
          theme:     opts?.theme,
          config:    opts?.config,
          enabledAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [tenantAppAccess.tenantId, tenantAppAccess.appId],
          set: {
            isEnabled: true,
            theme:     opts?.theme,
            config:    opts?.config,
            enabledAt: new Date(),
            updatedAt: new Date(),
          },
        })
    },

    async disableApp(tenantId, appId) {
      await db
        .update(tenantAppAccess)
        .set({ isEnabled: false, updatedAt: new Date() })
        .where(and(
          eq(tenantAppAccess.tenantId, tenantId),
          eq(tenantAppAccess.appId,    appId),
        ))
    },

    async updateTheme(tenantId, appId, theme) {
      await db
        .update(tenantAppAccess)
        .set({ theme, updatedAt: new Date() })
        .where(and(
          eq(tenantAppAccess.tenantId, tenantId),
          eq(tenantAppAccess.appId,    appId),
        ))
    },

    async setModuleAccess(tenantId, appId, moduleSlug, enabled) {
      const [module] = await db
        .select({ id: platformModules.id })
        .from(platformModules)
        .where(and(
          eq(platformModules.appId, appId),
          eq(platformModules.slug,  moduleSlug),
        ))
        .limit(1)

      if (!module) return

      await db
        .insert(tenantModuleAccess)
        .values({ tenantId, appId, moduleId: module.id, isEnabled: enabled })
        .onConflictDoUpdate({
          target: [tenantModuleAccess.tenantId, tenantModuleAccess.moduleId],
          set: { isEnabled: enabled },
        })
    },
  }
}

export type PlatformClientInstance = ReturnType<typeof createPlatformClient>
