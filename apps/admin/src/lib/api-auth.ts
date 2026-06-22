import crypto from 'crypto'
import { db, platformSchema } from './db'
import { eq, and } from 'drizzle-orm'

const HASH_ALGORITHM = 'sha256'

/**
 * Generate API key pair: public key (to give to client) + hash (to store)
 * Format: sk_app_randomstring (64 chars total)
 */
export function generateApiKey(appId: string): { publicKey: string; hash: string } {
  const prefix = `sk_${appId}_`
  const randomBytes = crypto.randomBytes(32).toString('hex')
  const publicKey = `${prefix}${randomBytes}`.slice(0, 64)

  const hash = crypto
    .createHash(HASH_ALGORITHM)
    .update(publicKey)
    .digest('hex')

  return { publicKey, hash }
}

/**
 * Hash a provided API key (for verification)
 */
export function hashApiKey(apiKey: string): string {
  return crypto
    .createHash(HASH_ALGORITHM)
    .update(apiKey)
    .digest('hex')
}

/**
 * Validate and retrieve API key from Authorization header
 * Returns the api_key record or null if invalid
 */
export async function validateApiKey(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const apiKey = authHeader.slice(7) // Remove "Bearer "
  const keyHash = hashApiKey(apiKey)

  const [record] = await db
    .select()
    .from(platformSchema.apiKeys)
    .where(
      and(
        eq(platformSchema.apiKeys.keyHash, keyHash),
        eq(platformSchema.apiKeys.isActive, true)
      )
    )
    .limit(1)

  if (!record) {
    return null
  }

  // Check expiration
  if (record.expiresAt && record.expiresAt < new Date()) {
    return null
  }

  // Update last_used_at
  await db
    .update(platformSchema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(platformSchema.apiKeys.id, record.id))

  return record
}

/**
 * Check if API key has required permission
 */
export function hasPermission(apiKey: any, permission: string): boolean {
  const permissions = (apiKey.permissions as string[]) || []
  return permissions.includes(permission) || permissions.includes('*')
}

/**
 * Create API key record in database
 */
export async function createApiKeyRecord(
  appId: string,
  name: string,
  permissions: string[] = ['read', 'write'],
  tenantId?: string,
  expiresAt?: Date,
  rateLimitPerMinute?: number
) {
  const { publicKey, hash } = generateApiKey(appId)

  const [record] = await db
    .insert(platformSchema.apiKeys)
    .values({
      name,
      keyHash: hash,
      appId,
      tenantId: tenantId || null,
      permissions,
      rateLimitPerMinute: rateLimitPerMinute || 60,
      expiresAt: expiresAt || null,
      isActive: true,
    })
    .returning()

  return {
    ...record,
    publicKey, // Only shown once at creation
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string) {
  await db
    .update(platformSchema.apiKeys)
    .set({ isActive: false })
    .where(eq(platformSchema.apiKeys.id, keyId))
}

/**
 * List all API keys (without showing the actual key)
 */
export async function listApiKeys(appId?: string, tenantId?: string) {
  const query = db.select().from(platformSchema.apiKeys)

  if (appId) {
    return query.where(eq(platformSchema.apiKeys.appId, appId))
  }

  if (tenantId) {
    return query.where(eq(platformSchema.apiKeys.tenantId, tenantId))
  }

  return query
}
