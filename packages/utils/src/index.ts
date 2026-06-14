import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { NextResponse } from 'next/server'

// ─── CSS class merging ───────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ─── Formatters ──────────────────────────────────────────────────────────────

export function formatCurrency(
  amount: number,
  currency: 'COP' | 'USD' | 'EUR' = 'COP',
): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'COP' ? 0 : 2,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount)
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat('es-CO').format(points)
}

export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    ...options,
  }).format(d)
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'Ahora mismo'
  if (minutes < 60) return `Hace ${minutes} min`
  if (hours < 24) return `Hace ${hours}h`
  if (days < 7) return `Hace ${days}d`
  return formatDate(d)
}

// ─── HTTP response helpers ────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 })
}

export function badRequest(message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status: 400 })
}

export function unauthorized(message = 'No autenticado'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Acceso denegado'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = 'No encontrado'): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function conflict(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 409 })
}

export function serverError(message = 'Error interno del servidor'): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 })
}

// ─── General utilities ────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function generateId(prefix?: string): string {
  const id = Math.random().toString(36).slice(2, 10)
  return prefix ? `${prefix}_${id}` : id
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key]
    return acc
  }, {} as Pick<T, K>)
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) delete result[key]
  return result as Omit<T, K>
}

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}
