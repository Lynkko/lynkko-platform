import { createDb } from '@lynkko/db'
import { notifications, createNotificationService } from '@lynkko/notifications'

type NotifService = ReturnType<typeof createNotificationService>

let _notif: NotifService | null = null

function getNotif(): NotifService {
  if (!_notif) {
    const db = createDb({ notifications }, process.env.NOTIFICATIONS_DATABASE_URL)
    _notif = createNotificationService(db)
  }
  return _notif
}

/**
 * Servicio de notificaciones sobre la DB propia.
 * Lazy proxy: no inicializa la conexión hasta el primer uso, para que
 * `next build` (recolección de page data) no falle por falta de env.
 */
export const notif = new Proxy({} as NotifService, {
  get(_t, prop) {
    const value = (getNotif() as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(getNotif()) : value
  },
})
