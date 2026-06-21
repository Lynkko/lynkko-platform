import { createDb } from '@lynkko/db'
import { authSchema } from '@lynkko/auth'
import { platformSchema } from '@lynkko/platform'

const schema = { ...authSchema, ...platformSchema }

export const db = createDb(schema, process.env.PLATFORM_DATABASE_URL)

export { platformSchema }
