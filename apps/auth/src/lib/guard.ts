import { unauthorized } from '@lynkko/utils'

/**
 * Valida la API key del servicio (Bearer AUTH_SERVICE_API_KEY) para los endpoints
 * server-to-server (p.ej. gestión de membresías). Los endpoints de Better Auth
 * (/api/auth/*) NO usan esto — se protegen por sesión.
 */
export function requireServiceKey(req: Request): Response | null {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token || token !== process.env.AUTH_SERVICE_API_KEY) {
    return unauthorized('Invalid or missing service API key')
  }
  return null
}
