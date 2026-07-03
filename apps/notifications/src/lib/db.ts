import { createDb } from '@lynkko/db'
import { notifications, createNotificationService } from '@lynkko/notifications'

type NotifService = ReturnType<typeof createNotificationService>

let _notif: NotifService | null = null

function createNotificationsDb() {
  const databaseUrl = process.env.NOTIFICATIONS_DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      '[@lynkko/notifications-service] NOTIFICATIONS_DATABASE_URL no está definida. ' +
      'Configura la base de datos propia del servicio Notifications.',
    )
  }
  return createDb({ notifications }, databaseUrl)
}

function getNotif(): NotifService {
  if (!_notif) {
    _notif = createNotificationService(createNotificationsDb())
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
