import { createDb } from '@lynkko/db'
import { authSchema, membershipSchema } from '@lynkko/auth'

const schema = { ...authSchema, ...membershipSchema }

type DbInstance = ReturnType<typeof createDb<typeof schema>>

let _db: DbInstance | null = null

function createAuthDb(): DbInstance {
  const databaseUrl = process.env.AUTH_DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      '[@lynkko/auth-service] AUTH_DATABASE_URL no está definida. ' +
      'Configura la base de datos propia del servicio Auth.',
    )
  }
  return createDb(schema, databaseUrl)
}

function getDb(): DbInstance {
  if (!_db) _db = createAuthDb()
  return _db
}

/**
 * DB propia del host central de identidad (user/session/account/verification/membership).
 * Lazy proxy: no inicializa la conexión hasta el primer uso (build-safe).
 */
export const db = new Proxy({} as DbInstance, {
  get(_t, prop) {
    const value = (getDb() as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(getDb()) : value
  },
})
