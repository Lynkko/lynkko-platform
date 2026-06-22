import { db, platformSchema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, notFound, serverError } from '@lynkko/utils'
import { revokeApiKey } from '@/lib/api-auth'
import type { NextRequest } from 'next/server'

interface Params {
  params: Promise<{ keyId: string }>
}

/**
 * POST /api/api-keys/{keyId}/revoke
 * Revoke an API key (deactivate it)
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { keyId } = await params

    // Verify key exists
    const [key] = await db
      .select()
      .from(platformSchema.apiKeys)
      .where(eq(platformSchema.apiKeys.id, keyId))
      .limit(1)

    if (!key) {
      return notFound('API key not found')
    }

    // Revoke the key
    await revokeApiKey(keyId)

    return ok({
      status: 'revoked',
      key_id: keyId,
      revoked_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error revoking API key:', error)
    return serverError('Failed to revoke API key')
  }
}
