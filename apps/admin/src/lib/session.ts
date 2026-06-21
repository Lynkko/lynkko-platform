import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './auth'

export async function requireSuperadmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  // Solo usuarios con role 'superadmin' en la DB de platform pueden acceder
  const user = session.user as { role?: string }
  if (user.role !== 'superadmin') redirect('/unauthorized')
  return session
}

export async function getOptionalSession() {
  return auth.api.getSession({ headers: await headers() })
}
