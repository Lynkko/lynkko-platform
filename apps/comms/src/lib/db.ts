import { createDb } from '@lynkko/db'
import { commsSchema } from '@lynkko/comms'

type DbInstance = ReturnType<typeof createDb<typeof commsSchema>>

let _db: DbInstance | null = null

function createCommsDb(): DbInstance {
  const databaseUrl = process.env.COMMS_DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      '[@lynkko/comms-service] COMMS_DATABASE_URL no está definida. ' +
      'Configura la base de datos propia del servicio Comms.',
    )
  }
  return createDb(commsSchema, databaseUrl)
}

function getDb(): DbInstance {
  if (!_db) _db = createCommsDb()
  return _db
}

/** Outbox propio del servicio. Lazy proxy (build-safe). */
export const db = new Proxy({} as DbInstance, {
  get(_t, prop) {
    const value = (getDb() as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(getDb()) : value
  },
})
