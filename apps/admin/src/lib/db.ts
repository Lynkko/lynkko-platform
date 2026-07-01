import { createDb } from '@lynkko/db'
import { authSchema } from '@lynkko/auth'
import { platformSchema } from '@lynkko/platform'

const schema = { ...authSchema, ...platformSchema }

type DbInstance = ReturnType<typeof createDb<typeof schema>>

let _db: DbInstance | null = null

function getDb(): DbInstance {
  if (!_db) _db = createDb(schema, process.env.PLATFORM_DATABASE_URL)
  return _db
}

/**
 * Lazy proxy: la conexión no se inicializa hasta el primer uso, para que
 * `next build` (recolección de page data) no falle cuando PLATFORM_DATABASE_URL
 * no está disponible en el entorno de build (p.ej. previews de Vercel).
 */
export const db = new Proxy({} as DbInstance, {
  get(_t, prop) {
    const value = (getDb() as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(getDb()) : value
  },
})

export { platformSchema }
