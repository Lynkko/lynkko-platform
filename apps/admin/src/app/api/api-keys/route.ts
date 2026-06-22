import { db, platformSchema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, badRequest, notFound, serverError } from '@lynkko/utils'
import { createApiKeyRecord, listApiKeys } from '@/lib/api-auth'
import type { NextRequest } from 'next/server'

/**
 * GET /api/api-keys
 * List API keys for an app or tenant (doesn't show the actual key)
 * Query: ?app_id=turnflow or ?tenant_id=tenant_123
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const appId = searchParams.get('app_id')
    const tenantId = searchParams.get('tenant_id')

    let keys

    if (appId) {
      keys = await listApiKeys(appId)
    } else if (tenantId) {
      keys = await listApiKeys(undefined, tenantId)
    } else {
      keys = await listApiKeys()
    }

    // Hide sensitive data
    const sanitized = keys.map((key: any) => ({
      id: key.id,
      name: key.name,
      appId: key.appId,
      tenantId: key.tenantId,
      permissions: key.permissions,
      rateLimitPerMinute: key.rateLimitPerMinute,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
      // keyHash is intentionally hidden
    }))

    return ok({
      keys: sanitized,
      total: sanitized.length,
    })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return serverError('Failed to fetch API keys')
  }
}

/**
 * POST /api/api-keys
 * Create a new API key
 * Body: {
 *   name: string
 *   app_id: string
 *   tenant_id?: string (if app-specific)
 *   permissions?: string[] (default: ['read', 'write'])
 *   expires_in_days?: number
 *   rate_limit_per_minute?: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      app_id,
      tenant_id,
      permissions,
      expires_in_days,
      rate_limit_per_minute,
    } = body

    // Validate required fields
    if (!name || !app_id) {
      return badRequest('Missing required fields: name, app_id')
    }

    // Verify app exists
    const [app] = await db
      .select()
      .from(platformSchema.platformApps)
      .where(eq(platformSchema.platformApps.id, app_id))
      .limit(1)

    if (!app) {
      return notFound('App not found')
    }

    // Calculate expiration
    let expiresAt: Date | undefined
    if (expires_in_days) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expires_in_days)
    }

    // Create API key
    const keyRecord = await createApiKeyRecord(
      app_id,
      name,
      permissions || ['read', 'write'],
      tenant_id || undefined,
      expiresAt,
      rate_limit_per_minute || 60
    )

    return ok({
      status: 'created',
      key: {
        id: keyRecord.id,
        name: keyRecord.name,
        appId: keyRecord.appId,
        permissions: keyRecord.permissions,
        // Only show the public key once at creation
        publicKey: keyRecord.publicKey,
        warning: 'Save this key somewhere safe. You won\'t be able to see it again.',
        expiresAt: keyRecord.expiresAt,
        createdAt: keyRecord.createdAt,
      },
    })
  } catch (error) {
    console.error('Error creating API key:', error)
    return serverError('Failed to create API key')
  }
}
