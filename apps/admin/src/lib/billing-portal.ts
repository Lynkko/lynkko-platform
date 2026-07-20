/**
 * Portal de cobro tenant-facing — helpers de sesión firmada + firma de integridad Wompi.
 *
 * La app llama a /api/v1/billing/portal-session (con API key) para obtener un link
 * `/billing?session=<token>`. El token es un HMAC firmado con el secreto de platform,
 * corto (30 min), que identifica al tenant — así el tenant no necesita cuenta en platform.
 */
import crypto from 'crypto'

const SECRET = process.env.PLATFORM_WEBHOOK_SECRET ?? process.env.CRON_SECRET ?? 'dev-secret'
const INTEGRITY = process.env.WOMPI_INTEGRITY_SECRET ?? ''

/** Firma un token de portal para un tenant (base64url de `tenantId.exp.sig`). */
export function signSession(tenantId: string, ttlSeconds = 1800): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = `${tenantId}.${exp}`
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}.${sig}`).toString('base64url')
}

/** Verifica el token de portal; devuelve el tenantId o null. */
export function verifySession(token: string): { tenantId: string } | null {
  try {
    const parts = Buffer.from(token, 'base64url').toString().split('.')
    const [tenantId, exp, sig] = parts
    if (!tenantId || !exp || !sig) return null
    const expected = crypto.createHmac('sha256', SECRET).update(`${tenantId}.${exp}`).digest('hex')
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    if (Number(exp) < Math.floor(Date.now() / 1000)) return null
    return { tenantId }
  } catch {
    return null
  }
}

/**
 * Firma de integridad que exige el Web Checkout de Wompi:
 * SHA256(`${reference}${amountInCents}${currency}${integritySecret}`).
 */
export function integritySignature(reference: string, amountInCents: number, currency: string): string {
  return crypto.createHash('sha256').update(`${reference}${amountInCents}${currency}${INTEGRITY}`).digest('hex')
}
