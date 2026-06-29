import { createDb } from '@lynkko/db'
import { auditLogs, createAuditLogger } from '@lynkko/audit'

export const db = createDb({ auditLogs }, process.env.AUDIT_DATABASE_URL)

/** Logger de auditoría sobre la DB propia del servicio. */
export const audit = createAuditLogger(db)
