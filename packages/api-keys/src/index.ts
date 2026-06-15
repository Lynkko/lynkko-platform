import { createHash, randomBytes } from 'crypto'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiKeyPair {
  /** Clave en texto plano — mostrar al usuario UNA SOLA VEZ. */
  key: string
  /** Hash SHA-256 de la clave — guardar en DB. */
  hash: string
}

export interface ApiKeyRecord {
  id:         string
  hash:       string
  name:       string
  tenantId:   string
  createdBy:  string
  lastUsedAt: Date | null
  expiresAt:  Date | null
  createdAt:  Date
}

// ─── Generación ──────────────────────────────────────────────────────────────

/**
 * Genera un par clave/hash para una nueva API key.
 * Guardar solo el hash en DB; la key se muestra al usuario una sola vez.
 *
 * @example
 * const { key, hash } = generateApiKey('lnk')
 * // key  → "lnk_4K7mXzT9..."  (mostrar al usuario)
 * // hash → "a3f9b2..."         (guardar en DB)
 *
 * await db.insert(apiKeys).values({ hash, name, tenantId, createdBy })
 * return ok({ key })  // NO retornar el hash
 */
export function generateApiKey(prefix = 'lnk'): ApiKeyPair {
  const raw  = randomBytes(32).toString('base64url')
  const key  = `${prefix}_${raw}`
  const hash = hashApiKey(key)
  return { key, hash }
}

// ─── Hashing ─────────────────────────────────────────────────────────────────

/**
 * Hashea una API key con SHA-256 para buscarla en DB.
 *
 * @example
 * // En el middleware de validación:
 * const rawKey = extractApiKey(req)
 * if (!rawKey) return unauthorized()
 * const hash = hashApiKey(rawKey)
 * const record = await db.query.apiKeys.findFirst({ where: eq(apiKeys.hash, hash) })
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

// ─── Extracción del request ───────────────────────────────────────────────────

/**
 * Extrae la API key cruda del header `X-API-Key`.
 * Retorna null si el header no está presente o está vacío.
 *
 * @example
 * const key = extractApiKey(req)
 * if (!key) return unauthorized('X-API-Key requerido')
 */
export function extractApiKey(req: Request): string | null {
  const value = req.headers.get('X-API-Key') ?? req.headers.get('x-api-key')
  return value && value.trim().length > 0 ? value.trim() : null
}

// ─── Validación de formato ────────────────────────────────────────────────────

/**
 * Valida que una key tenga el formato `prefix_base64url`.
 * No verifica si existe en DB — eso es responsabilidad del llamador.
 *
 * @example
 * if (!isValidApiKeyFormat(rawKey)) return badRequest('Formato de API key inválido')
 */
export function isValidApiKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') return false
  const parts = key.split('_')
  if (parts.length < 2) return false
  const [, ...rest] = parts
  const payload = rest.join('_')
  return /^[A-Za-z0-9_-]{20,}$/.test(payload)
}

// ─── Middleware pattern ───────────────────────────────────────────────────────

/**
 * Resultado completo de validar una API key en un request.
 */
export interface ApiKeyValidation {
  valid:   boolean
  hash?:   string
  rawKey?: string
  error?:  'missing' | 'invalid_format'
}

/**
 * Extrae y valida el formato de la API key del request.
 * Para verificar existencia en DB, usar el hash retornado.
 *
 * @example
 * export async function middleware(req: Request) {
 *   const { valid, hash, error } = validateApiKeyRequest(req)
 *   if (!valid) return unauthorized(error === 'missing' ? 'X-API-Key requerido' : 'API key inválida')
 *
 *   const record = await db.query.apiKeys.findFirst({
 *     where: and(eq(apiKeys.hash, hash!), isNull(apiKeys.revokedAt))
 *   })
 *   if (!record) return unauthorized('API key no encontrada o revocada')
 *   if (record.expiresAt && record.expiresAt < new Date()) return unauthorized('API key expirada')
 *
 *   // Actualizar last_used_at (fire-and-forget)
 *   void db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, record.id))
 * }
 */
export function validateApiKeyRequest(req: Request): ApiKeyValidation {
  const rawKey = extractApiKey(req)
  if (!rawKey) return { valid: false, error: 'missing' }
  if (!isValidApiKeyFormat(rawKey)) return { valid: false, error: 'invalid_format' }
  return { valid: true, hash: hashApiKey(rawKey), rawKey }
}

// ─── Schema Drizzle sugerido ──────────────────────────────────────────────────
//
// import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
//
// export const apiKeys = pgTable('api_keys', {
//   id:         uuid('id').primaryKey().defaultRandom(),
//   tenantId:   uuid('tenant_id').notNull(),
//   createdBy:  uuid('created_by').notNull(),  // userId
//   name:       text('name').notNull(),          // etiqueta para el usuario
//   hash:       text('hash').notNull().unique(), // SHA-256 de la key
//   lastUsedAt: timestamp('last_used_at'),
//   expiresAt:  timestamp('expires_at'),
//   revokedAt:  timestamp('revoked_at'),         // null = activa
//   createdAt:  timestamp('created_at').notNull().defaultNow(),
// })
