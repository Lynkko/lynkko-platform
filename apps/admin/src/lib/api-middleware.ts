import { unauthorized } from '@lynkko/utils'
import { validateApiKey, hasPermission } from './api-auth'
import { logAuditEvent, getRequestInfo } from './audit-log'
import type { NextRequest } from 'next/server'

export interface ApiContext {
  apiKey: any
  appId: string
  tenantId: string | null
  userId: string
  ipAddress: string
  userAgent: string
}

/**
 * Middleware to validate API key and extract context
 * Usage: const ctx = await validateApiKeyMiddleware(req)
 */
export async function validateApiKeyMiddleware(req: NextRequest): Promise<ApiContext | null> {
  const authHeader = req.headers.get('authorization')
  const apiKey = await validateApiKey(authHeader)

  if (!apiKey) {
    return null
  }

  const { ipAddress, userAgent } = getRequestInfo(req)

  return {
    apiKey,
    appId: apiKey.appId,
    tenantId: apiKey.tenantId,
    userId: `api_key:${apiKey.id}`,
    ipAddress,
    userAgent,
  }
}

/**
 * Check if API key has required permission
 */
export function requirePermission(context: ApiContext, permission: string): boolean {
  return hasPermission(context.apiKey, permission)
}

/**
 * Log an API operation to audit trail
 */
export async function logApiOperation(
  context: ApiContext,
  resourceType: string,
  resourceId: string,
  action: string,
  changes?: any,
  status?: 'success' | 'failure',
  errorMessage?: string
) {
  await logAuditEvent(
    {
      userId: context.userId,
      resourceType: resourceType as any,
      resourceId,
      action: action as any,
      changes,
      metadata: {
        apiKeyId: context.apiKey.id,
        apiKeyName: context.apiKey.name,
      },
      status: status || 'success',
      errorMessage,
    },
    context.ipAddress,
    context.userAgent
  )
}

/**
 * Response helper for API key errors
 */
export function apiKeyError(message: string) {
  return unauthorized(message)
}
