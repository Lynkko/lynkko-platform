import {
  boolean,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

// ─── Better Auth — tablas requeridas ─────────────────────────────────────────
// Generadas con el schema estándar de Better Auth para PostgreSQL.
// Importar y mergear con el schema de cada app:
//
//   import { authSchema } from '@lynkko/auth/schema'
//   import * as appTables from './app-tables'
//   export const schema = { ...authSchema, ...appTables }

export const user = pgTable('user', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image:         text('image'),
  role:          text('role').notNull().default('user'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id:          text('id').primaryKey(),
  expiresAt:   timestamp('expires_at').notNull(),
  token:       text('token').notNull().unique(),
  ipAddress:   text('ip_address'),
  userAgent:   text('user_agent'),
  userId:      text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
})

export const account = pgTable('account', {
  id:                     text('id').primaryKey(),
  accountId:              text('account_id').notNull(),
  providerId:             text('provider_id').notNull(),
  userId:                 text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken:            text('access_token'),
  refreshToken:           text('refresh_token'),
  idToken:                text('id_token'),
  accessTokenExpiresAt:   timestamp('access_token_expires_at'),
  refreshTokenExpiresAt:  timestamp('refresh_token_expires_at'),
  scope:                  text('scope'),
  password:               text('password'),
  createdAt:              timestamp('created_at').notNull().defaultNow(),
  updatedAt:              timestamp('updated_at').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at').defaultNow(),
  updatedAt:  timestamp('updated_at').defaultNow(),
})

/** Spread en el schema de tu app para incluir las tablas de auth. */
export const authSchema = { user, session, account, verification }

// ─── Membresías (WS-4) ───────────────────────────────────────────────────────
// Modela la autorización: una identidad global (user) puede pertenecer a varias
// apps/tenants con un rol distinto en cada una. La AUTENTICACIÓN es central (user);
// la AUTORIZACIÓN es por membresía. Solo el host central de identidad incluye
// esta tabla — las apps consumen las membresías por API, no la replican.
export const membership = pgTable('membership', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  appId:     text('app_id').notNull(),     // 'turnflow' | 'pec' | ...
  tenantId:  text('tenant_id').notNull(),  // tenant dentro de esa app
  role:      text('role').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/** Spread SOLO en el host central de identidad (lynkko-auth), no en cada app. */
export const membershipSchema = { membership }
