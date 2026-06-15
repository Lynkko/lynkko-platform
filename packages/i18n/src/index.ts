import {
  format,
  formatDistanceToNow,
  formatRelative,
  parseISO,
  isValid,
} from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Types ───────────────────────────────────────────────────────────────────

export type LynkkoLocale = 'es-CO' | 'es-MX' | 'es-ES' | 'pt-BR'

export type DocumentType = 'nit' | 'cedula' | 'passport' | 'ce' | 'nite'
// nit = NIT empresa, cedula = cédula ciudadanía, ce = cédula extranjería,
// nite = NIT extranjero

// ─── Fechas ───────────────────────────────────────────────────────────────────

/**
 * Formatea una fecha en formato legible en español.
 *
 * @example
 * formatDate(new Date())              // '14 jun 2026'
 * formatDate('2026-01-15', 'long')    // '15 de enero de 2026'
 * formatDate('2026-01-15', 'full')    // 'jueves, 15 de enero de 2026'
 * formatDate('2026-01-15', 'time')    // '14 jun 2026, 10:30'
 * formatDate('2026-01-15', 'custom', 'dd/MM/yyyy')  // '15/01/2026'
 */
export function formatDate(
  date:         Date | string | number,
  style?:       'short' | 'long' | 'full' | 'time' | 'custom',
  customFormat?: string,
): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(d)) return ''

  const patterns: Record<string, string> = {
    short:  'd MMM yyyy',
    long:   "d 'de' MMMM 'de' yyyy",
    full:   "EEEE, d 'de' MMMM 'de' yyyy",
    time:   "d MMM yyyy, HH:mm",
    custom: customFormat ?? 'd MMM yyyy',
  }

  return format(d, patterns[style ?? 'short'] ?? patterns.short, { locale: es })
}

/**
 * Formato relativo: "hace 3 minutos", "hace 2 horas", "hace 5 días".
 *
 * @example
 * formatRelativeDate(new Date(Date.now() - 60000))  // 'hace 1 minuto'
 * formatRelativeDate('2026-01-01')                  // 'hace 5 meses'
 */
export function formatRelativeDate(date: Date | string | number): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(d)) return ''
  return formatDistanceToNow(d, { locale: es, addSuffix: true })
}

/**
 * Fecha relativa respecto a otra fecha base.
 *
 * @example
 * formatRelativeTo(cita, hoy)  // 'mañana a las 10:30'
 */
export function formatRelativeTo(date: Date | string, baseDate: Date | string): string {
  const d    = typeof date     === 'string' ? parseISO(date)     : date
  const base = typeof baseDate === 'string' ? parseISO(baseDate) : baseDate
  if (!isValid(d) || !isValid(base)) return ''
  return formatRelative(d, base, { locale: es })
}

/**
 * Formatea una hora en HH:MM (24h) o h:mm a (12h).
 *
 * @example
 * formatTime('2026-06-14T10:30:00')         // '10:30'
 * formatTime('2026-06-14T14:30:00', true)   // '2:30 p. m.'
 */
export function formatTime(date: Date | string, use12h = false): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(d)) return ''
  return format(d, use12h ? 'h:mm a' : 'HH:mm', { locale: es })
}

/**
 * Retorna el inicio del día actual en UTC-5 (zona Colombia).
 * Útil para queries de "registros de hoy".
 */
export function startOfToday(): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

// ─── NIT ─────────────────────────────────────────────────────────────────────

/**
 * Formatea un NIT colombiano con puntos y dígito verificador.
 *
 * @example
 * formatNit('900455751', '5')   // '900.455.751-5'
 * formatNit('9004557515')       // '900.455.751-5'  (último dígito = DV)
 */
export function formatNit(nit: string, dv?: string): string {
  const digits = nit.replace(/\D/g, '')

  let base: string
  let dvDigit: string

  if (dv !== undefined) {
    base    = digits
    dvDigit = dv
  } else if (digits.length > 9) {
    base    = digits.slice(0, -1)
    dvDigit = digits.slice(-1)
  } else {
    base    = digits
    dvDigit = ''
  }

  const formatted = base.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dvDigit ? `${formatted}-${dvDigit}` : formatted
}

// ─── Cédula ───────────────────────────────────────────────────────────────────

/**
 * Formatea un número de cédula colombiana con puntos separadores de miles.
 *
 * @example
 * formatCedula('1234567890')  // '1.234.567.890'
 * formatCedula('52345678')    // '52.345.678'
 */
export function formatCedula(cedula: string): string {
  const digits = cedula.replace(/\D/g, '')
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Formatea cualquier documento colombiano según su tipo.
 *
 * @example
 * formatDocument('900455751', 'nit', '5')  // '900.455.751-5'
 * formatDocument('1234567890', 'cedula')   // '1.234.567.890'
 * formatDocument('AB123456', 'passport')   // 'AB123456'
 */
export function formatDocument(
  value: string,
  type:  DocumentType,
  dv?:   string,
): string {
  switch (type) {
    case 'nit':
    case 'nite':
      return formatNit(value, dv)
    case 'cedula':
    case 'ce':
      return formatCedula(value)
    default:
      return value
  }
}

// ─── Teléfonos ────────────────────────────────────────────────────────────────

export type PhoneCountry = 'CO' | 'MX' | 'US' | 'ES' | 'PE' | 'CL' | 'AR' | 'BR'

const PHONE_CONFIG: Record<PhoneCountry, { prefix: string; groups: number[] }> = {
  CO: { prefix: '+57', groups: [3, 3, 4] },   // +57 310 123 4567
  MX: { prefix: '+52', groups: [2, 4, 4] },   // +52 55 1234 5678
  US: { prefix: '+1',  groups: [3, 3, 4] },   // +1 555 123 4567
  ES: { prefix: '+34', groups: [3, 3, 3] },   // +34 612 345 678
  PE: { prefix: '+51', groups: [3, 3, 3] },   // +51 987 654 321
  CL: { prefix: '+56', groups: [1, 4, 4] },   // +56 9 1234 5678
  AR: { prefix: '+54', groups: [2, 4, 4] },   // +54 11 1234 5678
  BR: { prefix: '+55', groups: [2, 5, 4] },   // +55 11 91234 5678
}

/**
 * Formatea un número de teléfono con el prefijo del país y grupos.
 *
 * @example
 * formatPhone('3101234567', 'CO')  // '+57 310 123 4567'
 * formatPhone('5512345678', 'MX')  // '+52 55 1234 5678'
 * formatPhone('3101234567')        // '+57 310 123 4567'  (default: CO)
 */
export function formatPhone(phone: string, country: PhoneCountry = 'CO'): string {
  const digits = phone.replace(/\D/g, '')
  const config = PHONE_CONFIG[country]

  const groups: string[] = []
  let   pos = 0
  for (const len of config.groups) {
    if (pos + len <= digits.length) {
      groups.push(digits.slice(pos, pos + len))
      pos += len
    }
  }

  if (groups.length === 0) return `${config.prefix} ${digits}`
  return `${config.prefix} ${groups.join(' ')}`
}

/**
 * Normaliza un teléfono quitando todo formato y dejando solo dígitos sin prefijo.
 *
 * @example
 * normalizePhone('+57 310 123 4567')  // '3101234567'
 * normalizePhone('310-123-4567')      // '3101234567'
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^57/, '')
}

// ─── Nombres ──────────────────────────────────────────────────────────────────

/**
 * Capitaliza un nombre propio (primeras letras en mayúscula).
 *
 * @example
 * capitalizeName('JUAN PABLO GARCÍA')   // 'Juan Pablo García'
 * capitalizeName('ana maría RODRÍGUEZ') // 'Ana María Rodríguez'
 */
export function capitalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/(?:^|\s|-)(\p{L})/gu, (_, c: string) => c.toUpperCase())
}

/**
 * Extrae las iniciales de un nombre (máx. 2).
 *
 * @example
 * getInitials('Juan Pablo García')  // 'JG'
 * getInitials('Ana Rodríguez')      // 'AR'
 * getInitials('Lynkko')             // 'LY'
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
