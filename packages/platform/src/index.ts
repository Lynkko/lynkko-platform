import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { and, eq, ne, desc, count, sum } from 'drizzle-orm'

// ─── Apps registradas en el ecosistema Lynkko ────────────────────────────────

export const LYNKKO_APPS = {
  PEC:        'pec',
  TURNFLOW:   'turnflow',
  CLUBPASS:   'clubpass',
  INCENTIVOS: 'incentivos',
  PQRS:       'pqrs',
  HELP:       'help',
} as const

export type LynkkoAppId = typeof LYNKKO_APPS[keyof typeof LYNKKO_APPS]

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface AppTheme {
  primary:       string
  secondary?:    string
  accent?:       string
  appName?:      string
  logoUrl?:      string
  faviconUrl?:   string
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

export type TenantStatus       = 'trial' | 'active' | 'suspended' | 'churned'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused'
export type InvoiceStatus      = 'draft' | 'open' | 'paid' | 'void'

// ─── Schema ───────────────────────────────────────────────────────────────────

export const platformApps = pgTable('platform_apps', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  description: text('description'),
  url:         text('url'),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
})

export const platformModules = pgTable('platform_modules', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  appId:       text('app_id').notNull().references(() => platformApps.id, { onDelete: 'cascade' }),
  slug:        text('slug').notNull(),
  name:        text('name').notNull(),
  description: text('description'),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('platform_module_app_slug_idx').on(t.appId, t.slug),
])

export const tenantAppAccess = pgTable('tenant_app_access', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:  text('tenant_id').notNull(),
  appId:     text('app_id').notNull().references(() => platformApps.id, { onDelete: 'cascade' }),
  isEnabled: boolean('is_enabled').notNull().default(false),
  theme:     jsonb('theme').$type<AppTheme>(),
  config:    jsonb('config').$type<Record<string, unknown>>(),
  enabledAt: timestamp('enabled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('tenant_app_idx').on(t.tenantId, t.appId),
  index('tenant_app_tenant_idx').on(t.tenantId),
])

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

// ── Tenants (registro global de marcas/organizaciones) ────────────────────────

export const tenants = pgTable('tenants', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:         text('name').notNull(),
  slug:         text('slug').notNull().unique(),
  country:      text('country'),
  timezone:     text('timezone').default('America/Bogota'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  logoUrl:      text('logo_url'),
  status:       text('status').notNull().default('trial'),   // TenantStatus
  trialEndsAt:  timestamp('trial_ends_at'),
  notes:        text('notes'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
})

// ── Catálogo de planes por app ────────────────────────────────────────────────
// Precios en la unidad base de la moneda: COP = pesos, USD = cents

export const appPlans = pgTable('app_plans', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  appId:        text('app_id').notNull().references(() => platformApps.id, { onDelete: 'cascade' }),
  slug:         text('slug').notNull(),
  name:         text('name').notNull(),
  description:  text('description'),
  monthlyPrice: integer('monthly_price').notNull().default(0),
  annualPrice:  integer('annual_price').notNull().default(0),
  currency:     text('currency').notNull().default('COP'),
  maxSeats:     integer('max_seats'),
  features:     jsonb('features').$type<string[]>(),
  isPublic:     boolean('is_public').notNull().default(true),
  sortOrder:    integer('sort_order').notNull().default(0),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('app_plan_app_slug_idx').on(t.appId, t.slug),
  index('app_plan_app_idx').on(t.appId),
])

// ── Suscripciones ─────────────────────────────────────────────────────────────

export const subscriptions = pgTable('subscriptions', {
  id:                 text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:           text('tenant_id').notNull(),
  appId:              text('app_id').notNull().references(() => platformApps.id, { onDelete: 'cascade' }),
  planId:             text('plan_id').notNull().references(() => appPlans.id),
  status:             text('status').notNull().default('trialing'),  // SubscriptionStatus
  seats:              integer('seats').notNull().default(1),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd:   timestamp('current_period_end').notNull(),
  trialStart:         timestamp('trial_start'),
  trialEnd:           timestamp('trial_end'),
  cancelAtPeriodEnd:  boolean('cancel_at_period_end').notNull().default(false),
  canceledAt:         timestamp('canceled_at'),
  metadata:           jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('sub_tenant_app_idx').on(t.tenantId, t.appId),
  index('sub_tenant_idx').on(t.tenantId),
  index('sub_status_idx').on(t.status),
])

// ── Facturas ──────────────────────────────────────────────────────────────────

export const invoices = pgTable('invoices', {
  id:                 text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  number:             text('number').notNull().unique(),
  tenantId:           text('tenant_id').notNull(),
  status:             text('status').notNull().default('draft'),  // InvoiceStatus
  currency:           text('currency').notNull().default('COP'),
  subtotal:           integer('subtotal').notNull().default(0),
  tax:                integer('tax').notNull().default(0),
  total:              integer('total').notNull().default(0),
  dueDate:            timestamp('due_date'),
  paidAt:             timestamp('paid_at'),
  periodStart:        timestamp('period_start'),
  periodEnd:          timestamp('period_end'),
  wompiTransactionId: text('wompi_transaction_id'),
  wompiPaymentMethod: jsonb('wompi_payment_method'),
  notes:              text('notes'),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('invoice_tenant_idx').on(t.tenantId),
  index('invoice_status_idx').on(t.status),
])

export const invoiceItems = pgTable('invoice_items', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId:      text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  appId:          text('app_id').references(() => platformApps.id),
  subscriptionId: text('subscription_id').references(() => subscriptions.id),
  description:    text('description').notNull(),
  quantity:       integer('quantity').notNull().default(1),
  unitPrice:      integer('unit_price').notNull().default(0),
  amount:         integer('amount').notNull().default(0),
}, (t) => [
  index('invoice_item_invoice_idx').on(t.invoiceId),
])

// ── Registros de uso ──────────────────────────────────────────────────────────
// metric: 'active_users' | 'sessions' | 'api_calls' | 'storage_mb'
// period: 'YYYY-MM-DD' — una entrada por (tenant, app, metric, día)

export const usageRecords = pgTable('usage_records', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:  text('tenant_id').notNull(),
  appId:     text('app_id').notNull().references(() => platformApps.id, { onDelete: 'cascade' }),
  metric:    text('metric').notNull(),
  value:     integer('value').notNull().default(0),
  period:    text('period').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('usage_tenant_app_metric_period_idx').on(t.tenantId, t.appId, t.metric, t.period),
  index('usage_tenant_idx').on(t.tenantId),
  index('usage_period_idx').on(t.period),
])

// ── API Keys (platform_api_keys para evitar conflicto con apps) ───────────────

export const platformApiKeys = pgTable('platform_api_keys', {
  id:                text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:              text('name').notNull(),
  keyHash:           text('key_hash').notNull().unique(),
  appId:             text('app_id').notNull().references(() => platformApps.id, { onDelete: 'cascade' }),
  tenantId:          text('tenant_id'),
  permissions:       jsonb('permissions').$type<string[]>().notNull().default(['read']),
  rateLimitPerMinute:integer('rate_limit_per_minute').default(60),
  lastUsedAt:        timestamp('last_used_at'),
  expiresAt:         timestamp('expires_at'),
  isActive:          boolean('is_active').notNull().default(true),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
  updatedAt:         timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('platform_api_key_app_idx').on(t.appId),
  index('platform_api_key_tenant_idx').on(t.tenantId),
  index('platform_api_key_active_idx').on(t.isActive),
])

// ── Webhook deliveries ────────────────────────────────────────────────────────

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventType:    text('event_type').notNull(),
  tenantId:     text('tenant_id').notNull(),
  appId:        text('app_id').notNull(),
  payload:      jsonb('payload').$type<Record<string, unknown>>().notNull(),
  webhookUrl:   text('webhook_url').notNull(),
  status:       text('status').notNull().default('pending'), // pending, delivered, failed, archived
  httpStatus:   integer('http_status'),
  responseBody: text('response_body'),
  errorMessage: text('error_message'),
  attemptCount: integer('attempt_count').notNull().default(0),
  maxAttempts:  integer('max_attempts').notNull().default(5),
  nextRetryAt:  timestamp('next_retry_at'),
  deliveredAt:  timestamp('delivered_at'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('webhook_delivery_status_idx').on(t.status),
  index('webhook_delivery_app_idx').on(t.appId),
  index('webhook_delivery_tenant_idx').on(t.tenantId),
])

// ── Audit logs ────────────────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:       text('user_id').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId:   text('resource_id').notNull(),
  action:       text('action').notNull(),
  changes:      jsonb('changes').$type<Record<string, unknown>>(),
  metadata:     jsonb('metadata').$type<Record<string, unknown>>(),
  ipAddress:    text('ip_address'),
  userAgent:    text('user_agent'),
  status:       text('status').notNull().default('success'),
  errorMessage: text('error_message'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('audit_user_idx').on(t.userId),
  index('audit_resource_idx').on(t.resourceType, t.resourceId),
  index('audit_action_idx').on(t.action),
  index('audit_created_idx').on(t.createdAt),
])

// ── Billing cycles ────────────────────────────────────────────────────────────

export const billingCycles = pgTable('billing_cycles', {
  id:                    text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  subscriptionId:        text('subscription_id').notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
  tenantId:              text('tenant_id').notNull(),
  appId:                 text('app_id').notNull(),
  cycleStart:            timestamp('cycle_start').notNull(),
  cycleEnd:              timestamp('cycle_end').notNull(),
  nextInvoiceDate:       timestamp('next_invoice_date').notNull(),
  invoiceId:             text('invoice_id').references(() => invoices.id),
  invoiceGeneratedAt:    timestamp('invoice_generated_at'),
  paymentStatus:         text('payment_status').notNull().default('pending'),
  paymentAttempts:       integer('payment_attempts').notNull().default(0),
  maxPaymentAttempts:    integer('max_payment_attempts').notNull().default(3),
  lastPaymentAttemptAt:  timestamp('last_payment_attempt_at'),
  lastPaymentError:      text('last_payment_error'),
  metadata:              jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt:             timestamp('created_at').notNull().defaultNow(),
  updatedAt:             timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('billing_cycle_subscription_idx').on(t.subscriptionId),
  index('billing_cycle_tenant_idx').on(t.tenantId),
])

// ── Wompi transactions ────────────────────────────────────────────────────────

export const wompiTransactions = pgTable('wompi_transactions', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId:     text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  subscriptionId:text('subscription_id').notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
  tenantId:      text('tenant_id').notNull(),
  amount:        integer('amount').notNull(),
  currency:      text('currency').notNull().default('COP'),
  reference:     text('reference').notNull().unique(),
  status:        text('status').notNull(),
  paymentMethod: jsonb('payment_method').$type<Record<string, unknown>>(),
  wompiResponse: jsonb('wompi_response').$type<Record<string, unknown>>(),
  errorMessage:  text('error_message'),
  processedAt:   timestamp('processed_at'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('wompi_invoice_idx').on(t.invoiceId),
  index('wompi_tenant_idx').on(t.tenantId),
  index('wompi_status_idx').on(t.status),
])

// ── Payment methods ───────────────────────────────────────────────────────────

export const paymentMethods = pgTable('payment_methods', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:  text('tenant_id').notNull(),
  type:      text('type').notNull(),
  brand:     text('brand'),
  lastFour:  text('last_four'),
  token:     text('token').unique(),
  isDefault: boolean('is_default').notNull().default(false),
  isActive:  boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('payment_method_tenant_idx').on(t.tenantId),
  index('payment_method_default_idx').on(t.tenantId, t.isDefault),
])

// ── Failed payments ───────────────────────────────────────────────────────────

export const failedPayments = pgTable('failed_payments', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId:      text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  billingCycleId: text('billing_cycle_id').references(() => billingCycles.id, { onDelete: 'set null' }),
  tenantId:       text('tenant_id').notNull(),
  amount:         integer('amount').notNull(),
  currency:       text('currency').notNull().default('COP'),
  reason:         text('reason').notNull(),
  attemptCount:   integer('attempt_count').notNull().default(0),
  maxAttempts:    integer('max_attempts').notNull().default(5),
  nextRetryAt:    timestamp('next_retry_at'),
  lastRetryAt:    timestamp('last_retry_at'),
  resolvedAt:     timestamp('resolved_at'),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('failed_payment_tenant_idx').on(t.tenantId),
])

// ─── Drizzle inferred types ───────────────────────────────────────────────────

export type PlatformApp        = typeof platformApps.$inferSelect
export type PlatformModule     = typeof platformModules.$inferSelect
export type TenantAppAccess    = typeof tenantAppAccess.$inferSelect
export type TenantModuleAccess = typeof tenantModuleAccess.$inferSelect
export type Tenant             = typeof tenants.$inferSelect
export type AppPlan            = typeof appPlans.$inferSelect
export type Subscription       = typeof subscriptions.$inferSelect
export type Invoice            = typeof invoices.$inferSelect
export type InvoiceItem        = typeof invoiceItems.$inferSelect
export type UsageRecord        = typeof usageRecords.$inferSelect
export type PlatformApiKey     = typeof platformApiKeys.$inferSelect
export type WebhookDelivery    = typeof webhookDeliveries.$inferSelect
export type AuditLog           = typeof auditLogs.$inferSelect
export type BillingCycle       = typeof billingCycles.$inferSelect
export type WompiTransaction   = typeof wompiTransactions.$inferSelect
export type PaymentMethod      = typeof paymentMethods.$inferSelect
export type FailedPayment      = typeof failedPayments.$inferSelect

export const platformSchema = {
  platformApps,
  platformModules,
  tenantAppAccess,
  tenantModuleAccess,
  tenants,
  appPlans,
  subscriptions,
  invoices,
  invoiceItems,
  usageRecords,
  platformApiKeys,
  webhookDeliveries,
  auditLogs,
  billingCycles,
  wompiTransactions,
  paymentMethods,
  failedPayments,
}

// ─── SDK input types ──────────────────────────────────────────────────────────

export interface TenantAppSummary {
  appId:     LynkkoAppId
  isEnabled: boolean
  theme?:    AppTheme
  config?:   Record<string, unknown>
}

export interface CreateTenantInput {
  name:          string
  slug:          string
  country?:      string
  timezone?:     string
  contactEmail?: string
  contactPhone?: string
  logoUrl?:      string
  status?:       TenantStatus
  trialEndsAt?:  Date
  notes?:        string
}

export interface CreatePlanInput {
  appId:        string
  slug:         string
  name:         string
  description?: string
  monthlyPrice: number
  annualPrice:  number
  currency?:    string
  maxSeats?:    number
  features?:    string[]
  isPublic?:    boolean
  sortOrder?:   number
  isActive?:    boolean
}

export interface InvoiceItemInput {
  appId?:          string
  subscriptionId?: string
  description:     string
  quantity?:       number
  unitPrice:       number
}

export interface SubscriptionWithPlan {
  id:                 string
  tenantId:           string
  appId:              string
  status:             string
  seats:              number
  currentPeriodStart: Date
  currentPeriodEnd:   Date
  trialEnd:           Date | null
  cancelAtPeriodEnd:  boolean
  canceledAt:         Date | null
  plan: {
    id:           string
    name:         string
    slug:         string
    monthlyPrice: number
    annualPrice:  number
    currency:     string
  }
}

export interface MarketplaceItem {
  appId:               LynkkoAppId
  name:                string
  description?:        string | null
  url?:                string | null
  plans:               AppPlan[]
  currentSubscription: {
    status:           string
    planName:         string
    seats:            number
    currentPeriodEnd: Date
  } | null
  isEnabled: boolean
}

export interface TopTenantStat {
  tenantId:          string
  mrr:               number
  subscriptionCount: number
}

// ─── SDK ──────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

export interface PlatformClient {
  // ── Access control ──────────────────────────────────────────────────────────
  isAppEnabled(tenantId: string, appId: LynkkoAppId): Promise<boolean>
  isModuleEnabled(tenantId: string, appId: LynkkoAppId, moduleSlug: string): Promise<boolean>
  getAppTheme(tenantId: string, appId: LynkkoAppId): Promise<AppTheme | null>
  getTenantApps(tenantId: string): Promise<TenantAppSummary[]>
  enableApp(tenantId: string, appId: LynkkoAppId, config?: { theme?: AppTheme; config?: Record<string, unknown> }): Promise<void>
  disableApp(tenantId: string, appId: LynkkoAppId): Promise<void>
  updateTheme(tenantId: string, appId: LynkkoAppId, theme: AppTheme): Promise<void>
  setModuleAccess(tenantId: string, appId: LynkkoAppId, moduleSlug: string, enabled: boolean): Promise<void>

  // ── Tenants ─────────────────────────────────────────────────────────────────
  listTenants(): Promise<Tenant[]>
  getTenant(id: string): Promise<Tenant | null>
  createTenant(data: CreateTenantInput): Promise<Tenant>
  updateTenant(id: string, data: Partial<CreateTenantInput>): Promise<void>

  // ── Plans ───────────────────────────────────────────────────────────────────
  listPlans(appId?: string): Promise<AppPlan[]>
  createPlan(data: CreatePlanInput): Promise<AppPlan>
  updatePlan(id: string, data: Partial<CreatePlanInput>): Promise<void>

  // ── Subscriptions ───────────────────────────────────────────────────────────
  getSubscription(tenantId: string, appId: LynkkoAppId): Promise<SubscriptionWithPlan | null>
  listSubscriptions(tenantId: string): Promise<SubscriptionWithPlan[]>
  createSubscription(tenantId: string, appId: LynkkoAppId, planId: string, opts?: { seats?: number }): Promise<Subscription>
  cancelSubscription(subscriptionId: string): Promise<void>

  // ── Invoices ────────────────────────────────────────────────────────────────
  listInvoices(tenantId: string): Promise<Invoice[]>
  createInvoice(tenantId: string, items: InvoiceItemInput[], opts?: { currency?: string; tax?: number; notes?: string; dueDate?: Date }): Promise<Invoice>
  markInvoicePaid(invoiceId: string, wompiTransactionId: string, paymentMethod?: Record<string, unknown>): Promise<void>

  // ── Usage ───────────────────────────────────────────────────────────────────
  recordUsage(tenantId: string, appId: LynkkoAppId, metric: string, value: number, period?: string): Promise<void>
  getUsageSummary(tenantId: string): Promise<UsageRecord[]>

  // ── Marketplace ─────────────────────────────────────────────────────────────
  getMarketplace(tenantId: string, excludeAppId: LynkkoAppId): Promise<MarketplaceItem[]>

  // ── Reports ─────────────────────────────────────────────────────────────────
  getMRR(): Promise<number>
  getTopTenants(limit?: number): Promise<TopTenantStat[]>
}

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

  function generateInvoiceNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `INV-${date}-${rand}`
  }

  async function fetchSubsWithPlan(tenantId: string, appId?: string) {
    const condition = appId
      ? and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.appId, appId))
      : eq(subscriptions.tenantId, tenantId)

    const rows: Array<{ sub: Subscription; plan: AppPlan }> = await db
      .select({ sub: subscriptions, plan: appPlans })
      .from(subscriptions)
      .innerJoin(appPlans, eq(subscriptions.planId, appPlans.id))
      .where(condition)

    return rows.map(({ sub, plan }) => ({
      id:                 sub.id,
      tenantId:           sub.tenantId,
      appId:              sub.appId,
      status:             sub.status,
      seats:              sub.seats,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd:   sub.currentPeriodEnd,
      trialEnd:           sub.trialEnd,
      cancelAtPeriodEnd:  sub.cancelAtPeriodEnd,
      canceledAt:         sub.canceledAt,
      plan: {
        id:           plan.id,
        name:         plan.name,
        slug:         plan.slug,
        monthlyPrice: plan.monthlyPrice,
        annualPrice:  plan.annualPrice,
        currency:     plan.currency,
      },
    })) as SubscriptionWithPlan[]
  }

  return {
    // ── Access control ────────────────────────────────────────────────────────

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
          eq(tenantModuleAccess.tenantId, tenantId),
          eq(tenantModuleAccess.moduleId, module.id),
        ))
        .limit(1)

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

    // ── Tenants ───────────────────────────────────────────────────────────────

    async listTenants() {
      return db.select().from(tenants).orderBy(desc(tenants.createdAt))
    },

    async getTenant(id) {
      const [row] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1)
      return row ?? null
    },

    async createTenant(data) {
      const [row] = await db.insert(tenants).values({
        ...data,
        status: data.status ?? 'trial',
      }).returning()
      return row
    },

    async updateTenant(id, data) {
      await db
        .update(tenants)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(tenants.id, id))
    },

    // ── Plans ─────────────────────────────────────────────────────────────────

    async listPlans(appId) {
      if (appId) {
        return db.select().from(appPlans)
          .where(eq(appPlans.appId, appId))
          .orderBy(appPlans.sortOrder)
      }
      return db.select().from(appPlans).orderBy(appPlans.appId, appPlans.sortOrder)
    },

    async createPlan(data) {
      const [row] = await db.insert(appPlans).values({
        ...data,
        currency:  data.currency  ?? 'COP',
        isPublic:  data.isPublic  ?? true,
        isActive:  data.isActive  ?? true,
        sortOrder: data.sortOrder ?? 0,
      }).returning()
      return row
    },

    async updatePlan(id, data) {
      await db.update(appPlans).set(data).where(eq(appPlans.id, id))
    },

    // ── Subscriptions ─────────────────────────────────────────────────────────

    async getSubscription(tenantId, appId) {
      const results = await fetchSubsWithPlan(tenantId, appId)
      return results[0] ?? null
    },

    async listSubscriptions(tenantId) {
      return fetchSubsWithPlan(tenantId)
    },

    async createSubscription(tenantId, appId, planId, opts) {
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      const [row] = await db.insert(subscriptions).values({
        tenantId,
        appId,
        planId,
        status:             'trialing',
        seats:              opts?.seats ?? 1,
        currentPeriodStart: now,
        currentPeriodEnd:   periodEnd,
        trialStart:         now,
        trialEnd:           periodEnd,
      }).returning()
      return row
    },

    async cancelSubscription(subscriptionId) {
      await db
        .update(subscriptions)
        .set({ status: 'canceled', canceledAt: new Date(), updatedAt: new Date() })
        .where(eq(subscriptions.id, subscriptionId))
    },

    // ── Invoices ──────────────────────────────────────────────────────────────

    async listInvoices(tenantId) {
      return db
        .select()
        .from(invoices)
        .where(eq(invoices.tenantId, tenantId))
        .orderBy(desc(invoices.createdAt))
    },

    async createInvoice(tenantId, items, opts) {
      const currency = opts?.currency ?? 'COP'
      const subtotal = items.reduce((s, i) => s + i.unitPrice * (i.quantity ?? 1), 0)
      const tax      = opts?.tax ?? 0
      const total    = subtotal + tax

      const [invoice] = await db.insert(invoices).values({
        number:   generateInvoiceNumber(),
        tenantId,
        status:   'open',
        currency,
        subtotal,
        tax,
        total,
        dueDate:  opts?.dueDate,
        notes:    opts?.notes,
      }).returning()

      if (items.length > 0) {
        await db.insert(invoiceItems).values(
          items.map((item) => ({
            invoiceId:      invoice.id,
            appId:          item.appId,
            subscriptionId: item.subscriptionId,
            description:    item.description,
            quantity:       item.quantity ?? 1,
            unitPrice:      item.unitPrice,
            amount:         item.unitPrice * (item.quantity ?? 1),
          }))
        )
      }

      return invoice
    },

    async markInvoicePaid(invoiceId, wompiTransactionId, paymentMethod) {
      await db
        .update(invoices)
        .set({
          status:             'paid',
          paidAt:             new Date(),
          wompiTransactionId,
          wompiPaymentMethod: paymentMethod,
          updatedAt:          new Date(),
        })
        .where(eq(invoices.id, invoiceId))
    },

    // ── Usage ─────────────────────────────────────────────────────────────────

    async recordUsage(tenantId, appId, metric, value, period) {
      const p = period ?? new Date().toISOString().slice(0, 10)
      await db
        .insert(usageRecords)
        .values({ tenantId, appId, metric, value, period: p })
        .onConflictDoUpdate({
          target: [usageRecords.tenantId, usageRecords.appId, usageRecords.metric, usageRecords.period],
          set:    { value, updatedAt: new Date() },
        })
    },

    async getUsageSummary(tenantId) {
      return db
        .select()
        .from(usageRecords)
        .where(eq(usageRecords.tenantId, tenantId))
        .orderBy(desc(usageRecords.period))
        .limit(90)
    },

    // ── Marketplace ───────────────────────────────────────────────────────────

    async getMarketplace(tenantId, excludeAppId) {
      const apps = await db
        .select()
        .from(platformApps)
        .where(and(
          eq(platformApps.isActive, true),
          ne(platformApps.id, excludeAppId),
        ))

      const result: MarketplaceItem[] = []
      for (const app of apps) {
        const [plans, subs, access] = await Promise.all([
          db.select().from(appPlans).where(and(
            eq(appPlans.appId, app.id),
            eq(appPlans.isActive, true),
            eq(appPlans.isPublic, true),
          )).orderBy(appPlans.sortOrder),
          fetchSubsWithPlan(tenantId, app.id),
          getAccess(tenantId, app.id),
        ])
        const sub = subs[0] ?? null
        result.push({
          appId:       app.id as LynkkoAppId,
          name:        app.name,
          description: app.description,
          url:         app.url,
          plans,
          currentSubscription: sub ? {
            status:           sub.status,
            planName:         sub.plan.name,
            seats:            sub.seats,
            currentPeriodEnd: sub.currentPeriodEnd,
          } : null,
          isEnabled: access?.isEnabled ?? false,
        })
      }
      return result
    },

    // ── Reports ───────────────────────────────────────────────────────────────

    async getMRR() {
      const [result] = await db
        .select({ total: sum(appPlans.monthlyPrice) })
        .from(subscriptions)
        .innerJoin(appPlans, eq(subscriptions.planId, appPlans.id))
        .where(eq(subscriptions.status, 'active'))
      return Number(result?.total ?? 0)
    },

    async getTopTenants(limit = 10) {
      const rows = await db
        .select({
          tenantId:          subscriptions.tenantId,
          mrr:               sum(appPlans.monthlyPrice),
          subscriptionCount: count(),
        })
        .from(subscriptions)
        .innerJoin(appPlans, eq(subscriptions.planId, appPlans.id))
        .where(eq(subscriptions.status, 'active'))
        .groupBy(subscriptions.tenantId)
        .limit(limit)

      return (rows as Array<{ tenantId: string; mrr: string | null; subscriptionCount: number }>)
        .map((r) => ({
          tenantId:          r.tenantId,
          mrr:               Number(r.mrr ?? 0),
          subscriptionCount: r.subscriptionCount,
        }))
        .sort((a, b) => b.mrr - a.mrr)
    },
  }
}

export type PlatformClientInstance = ReturnType<typeof createPlatformClient>
