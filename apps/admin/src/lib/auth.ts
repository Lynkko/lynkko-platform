import { createAuth, toNextJsHandler, authSchema } from '@lynkko/auth'
import { createDb } from '@lynkko/db'
import { platformSchema } from '@lynkko/platform'

const db = createDb(
  { ...authSchema, ...platformSchema },
  process.env.PLATFORM_DATABASE_URL,
)

export const auth = createAuth({
  db,
  appName: 'Lynkko Platform',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
})

export { toNextJsHandler }
export type Session = typeof auth.$Infer.Session
