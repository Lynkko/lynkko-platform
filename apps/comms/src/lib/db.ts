import { createDb } from '@lynkko/db'
import { commsSchema } from '@lynkko/comms'

type DbInstance = ReturnType<typeof createDb<typeof commsSchema>>

let _db: DbInstance | null = null

function getDb(): DbInstance {
  if (!_db) _db = createDb(commsSchema, process.env.COMMS_DATABASE_URL)
  return _db
}

/** Outbox propio del servicio. Lazy proxy (build-safe). */
export const db = new Proxy({} as DbInstance, {
  get(_t, prop) {
    const value = (getDb() as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(getDb()) : value
  },
})
