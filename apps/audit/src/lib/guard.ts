import { unauthorized } from '@lynkko/utils'

/**
 * Valida la API key del servicio (Bearer AUDIT_API_KEY).
 * Devuelve una Response de error si es inválida, o null si pasa.
 */
export function requireServiceKey(req: Request): Response | null {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token || token !== process.env.AUDIT_API_KEY) {
    return unauthorized('Invalid or missing service API key')
  }
  return null
}
