import { createDb } from '@lynkko/db'
import { auditLogs, createAuditLogger } from '@lynkko/audit'

type AuditLogger = ReturnType<typeof createAuditLogger>

let _audit: AuditLogger | null = null

function getAudit(): AuditLogger {
  if (!_audit) {
    const db = createDb({ auditLogs }, process.env.AUDIT_DATABASE_URL)
    _audit = createAuditLogger(db)
  }
  return _audit
}

/**
 * Logger de auditoría sobre la DB propia del servicio.
 * Lazy proxy: no inicializa la conexión hasta el primer uso, para que
 * `next build` (recolección de page data) no falle por falta de env.
 */
export const audit = new Proxy({} as AuditLogger, {
  get(_t, prop) {
    const value = (getAudit() as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(getAudit()) : value
  },
})
