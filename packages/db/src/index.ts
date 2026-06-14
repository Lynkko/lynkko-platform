import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'

// Re-exportar todo lo necesario de drizzle-orm para que las apps
// no necesiten instalarlo directamente si solo usan helpers básicos
export {
  eq, ne, gt, gte, lt, lte,
  and, or, not,
  isNull, isNotNull,
  inArray, notInArray,
  like, ilike,
  between,
  sql,
  asc, desc,
  count, sum, avg, max, min,
} from 'drizzle-orm'

export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

// ─── Types ───────────────────────────────────────────────────────────────────

export type LynkkoDb = ReturnType<typeof createDb>

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Crea un cliente Drizzle conectado a Neon.
 *
 * Cada app pasa su propio schema para obtener tipos correctos:
 *
 * @example
 * // app/lib/db/index.ts
 * import { createDb } from '@lynkko/db'
 * import * as schema from './schema'
 *
 * export const db = createDb(schema)
 * export type Db = typeof db
 */
export function createDb<TSchema extends Record<string, unknown>>(
  schema: TSchema,
  databaseUrl?: string,
) {
  const url = databaseUrl ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      '[@lynkko/db] DATABASE_URL no está definida. ' +
      'Asegúrate de tener DATABASE_URL en tus variables de entorno.',
    )
  }
  const sql = neon(url)
  return drizzleNeon(sql, { schema })
}

/**
 * Igual que createDb pero usa DATABASE_URL_UNPOOLED.
 * Necesario para migraciones con drizzle-kit, que requiere
 * una conexión directa (sin PgBouncer).
 *
 * @example
 * // drizzle.config.ts
 * import { createDbDirect } from '@lynkko/db'
 * export default { db: createDbDirect(schema) }
 */
export function createDbDirect<TSchema extends Record<string, unknown>>(
  schema: TSchema,
  databaseUrl?: string,
) {
  const url = databaseUrl ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      '[@lynkko/db] DATABASE_URL_UNPOOLED no está definida.',
    )
  }
  const sql = neon(url)
  return drizzleNeon(sql, { schema })
}
