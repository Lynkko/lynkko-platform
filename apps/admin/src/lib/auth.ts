import { createAuth, toNextJsHandler, authSchema } from '@lynkko/auth'
import { createDb } from '@lynkko/db'
import { platformSchema } from '@lynkko/platform'

function getAuth() {
  const db = createDb(
    { ...authSchema, ...platformSchema },
    process.env.PLATFORM_DATABASE_URL,
  )
  return createAuth({
    db,
    appName: 'Lynkko Platform',
    baseUrl: process.env.NEXT_PUBLIC_APP_URL,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
  })
}

// Lazy singleton — avoids module-level DB init during Next.js build analysis
let _auth: ReturnType<typeof getAuth> | null = null
export function getAuthInstance() {
  if (!_auth) _auth = getAuth()
  return _auth
}

// Convenience proxy for server-side usage
export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    return (getAuthInstance() as Record<string | symbol, unknown>)[prop]
  },
})

export { toNextJsHandler }
export type Session = ReturnType<typeof getAuth>['$Infer']['Session']
