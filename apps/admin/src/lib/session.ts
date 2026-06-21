import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './auth'

export async function requireSuperadmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  if ((session.user as { role?: string }).role !== 'superadmin') redirect('/login')
  return session
}

export async function getOptionalSession() {
  return auth.api.getSession({ headers: await headers() })
}
