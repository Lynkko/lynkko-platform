import { unauthorized } from '@lynkko/utils'

/** Valida la API key del servicio (Bearer COMMS_API_KEY). */
export function requireServiceKey(req: Request): Response | null {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token || token !== process.env.COMMS_API_KEY) {
    return unauthorized('Invalid or missing service API key')
  }
  return null
}
