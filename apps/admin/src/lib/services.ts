import { eq } from 'drizzle-orm'
import { db, platformSchema } from './db'
import { createAuditHttpClient, type AuditEntry } from '@lynkko/audit'
import { createNotificationsHttpClient, type CreateNotificationInput } from '@lynkko/notifications'

/**
 * WS-2.4 — dispatcher de platform hacia los servicios del ecosistema.
 *
 * Resuelve la URL base desde el catálogo `platform_services` (con fallback a env)
 * y la API key desde env. Todo el dispatch es **best-effort**: nunca bloquea ni
 * lanza, para no romper el flujo principal si un servicio está caído o sin configurar.
 */

async function resolveBaseUrl(id: string, envFallback?: string): Promise<string | null> {
  try {
    const [svc] = await db
      .select()
      .from(platformSchema.platformServices)
      .where(eq(platformSchema.platformServices.id, id))
      .limit(1)
    if (svc?.isActive) return svc.baseUrl
  } catch {
    // El catálogo puede no existir aún (migración 0010 sin aplicar) → usa env.
  }
  return envFallback ?? null
}

export async function getAuditClient() {
  const baseUrl = await resolveBaseUrl('audit', process.env.AUDIT_URL)
  const key = process.env.AUDIT_API_KEY
  if (!baseUrl || !key) return null
  return createAuditHttpClient(baseUrl, key)
}

export async function getNotificationsClient() {
  const baseUrl = await resolveBaseUrl('notifications', process.env.NOTIFICATIONS_URL)
  const key = process.env.NOTIFICATIONS_API_KEY
  if (!baseUrl || !key) return null
  return createNotificationsHttpClient(baseUrl, key)
}

/** Registra un evento en el servicio central de audit. Fire-and-forget. */
export function dispatchAudit(entry: AuditEntry): void {
  void (async () => {
    try {
      const audit = await getAuditClient()
      if (!audit) return
      await audit.log(entry)
    } catch (error) {
      console.error('[services.dispatchAudit]', error)
    }
  })()
}

/** Crea una notificación in-app vía el servicio central. Fire-and-forget. */
export function dispatchNotification(input: CreateNotificationInput): void {
  void (async () => {
    try {
      const notif = await getNotificationsClient()
      if (!notif) return
      await notif.create(input)
    } catch (error) {
      console.error('[services.dispatchNotification]', error)
    }
  })()
}
