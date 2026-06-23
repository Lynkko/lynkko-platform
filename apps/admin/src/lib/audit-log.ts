import { db, platformSchema } from './db'
import { eq, and, desc, gte } from 'drizzle-orm'
import type { NextRequest } from 'next/server'

export interface AuditLogEntry {
  userId: string
  resourceType: 'plan' | 'subscription' | 'invoice' | 'module' | 'app' | 'tenant'
  resourceId: string
  action: 'create' | 'update' | 'delete' | 'enable' | 'disable' | 'cancel'
  changes?: Record<string, any>
  metadata?: Record<string, any>
  status?: 'success' | 'failure'
  errorMessage?: string
}

export async function logAuditEvent(
  entry: AuditLogEntry,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await db
      .insert(platformSchema.auditLogs)
      .values({
        userId: entry.userId,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        action: entry.action,
        changes: entry.changes || null,
        metadata: entry.metadata || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        status: entry.status || 'success',
        errorMessage: entry.errorMessage || null,
      })
  } catch (error) {
    console.error('Failed to log audit event:', error)
  }
}

export function getRequestInfo(req: NextRequest) {
  const ipAddress = (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown'
  ).trim()
  const userAgent = req.headers.get('user-agent') || 'unknown'
  return { ipAddress, userAgent }
}

export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string,
  limit: number = 100
) {
  return db
    .select()
    .from(platformSchema.auditLogs)
    .where(
      and(
        eq(platformSchema.auditLogs.resourceType, resourceType),
        eq(platformSchema.auditLogs.resourceId, resourceId)
      )
    )
    .limit(limit)
    .orderBy(desc(platformSchema.auditLogs.createdAt))
}

export async function getUserAuditLogs(userId: string, limit: number = 100) {
  return db
    .select()
    .from(platformSchema.auditLogs)
    .where(eq(platformSchema.auditLogs.userId, userId))
    .limit(limit)
    .orderBy(desc(platformSchema.auditLogs.createdAt))
}

export async function getAuditLogsByAction(
  action: string,
  limit: number = 100,
  sinceMinutes?: number
) {
  const conditions = [eq(platformSchema.auditLogs.action, action)]
  if (sinceMinutes) {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000)
    conditions.push(gte(platformSchema.auditLogs.createdAt, since) as any)
  }
  return db
    .select()
    .from(platformSchema.auditLogs)
    .where(and(...conditions))
    .limit(limit)
    .orderBy(desc(platformSchema.auditLogs.createdAt))
}

export async function getAuditSummary(days: number = 7) {
  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - days)

  const logs = await db
    .select()
    .from(platformSchema.auditLogs)
    .where(gte(platformSchema.auditLogs.createdAt, sinceDate))

  const summary = {
    total: logs.length,
    byAction: {} as Record<string, number>,
    byResource: {} as Record<string, number>,
    failures: logs.filter((l) => l.status === 'failure').length,
  }

  for (const log of logs) {
    summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1
    summary.byResource[log.resourceType] = (summary.byResource[log.resourceType] || 0) + 1
  }

  return summary
}
