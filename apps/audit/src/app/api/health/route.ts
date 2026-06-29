import { ok } from '@lynkko/utils'

export function GET(): Response {
  return ok({ service: 'lynkko-audit', status: 'healthy' })
}
