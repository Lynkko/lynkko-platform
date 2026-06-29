import { createDb } from '@lynkko/db'
import { notifications } from '@lynkko/notifications'
import { createNotificationService } from '@lynkko/notifications'

export const db = createDb({ notifications }, process.env.NOTIFICATIONS_DATABASE_URL)

/** Servicio de notificaciones sobre la DB propia del servicio. */
export const notif = createNotificationService(db)
