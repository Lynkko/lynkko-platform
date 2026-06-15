// ─── Types universales ────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface PendingMutation {
  id:        string
  operation: 'create' | 'update' | 'delete'
  resource:  string
  resourceId: string
  payload:   unknown
  createdAt: number  // timestamp ms
  retries:   number
}

export interface MutationQueueOptions {
  /** Máximo de reintentos antes de marcar como fallida. Default: 3 */
  maxRetries?: number
  /** Storage key para persistencia. Default: 'lynkko_mutation_queue' */
  storageKey?: string
}

// ─── MutationQueue ────────────────────────────────────────────────────────────

/**
 * Cola persistida en localStorage para operaciones pendientes de sincronizar.
 * Funciona en browser. En SSR retorna operaciones nulas (queue vacía).
 *
 * @example
 * // src/lib/offline.ts
 * export const queue = new MutationQueue({ maxRetries: 3 })
 *
 * // Agregar una mutación cuando el usuario crea un lead sin conexión:
 * await queue.push({ operation: 'create', resource: 'lead', resourceId: tempId, payload: lead })
 *
 * // Al recuperar conexión, drenar la cola:
 * const pending = queue.getAll()
 * for (const m of pending) {
 *   try {
 *     await syncMutation(m)
 *     queue.remove(m.id)
 *   } catch {
 *     queue.incrementRetry(m.id)
 *   }
 * }
 */
export class MutationQueue {
  private key:        string
  private maxRetries: number
  private isBrowser:  boolean

  constructor(options?: MutationQueueOptions) {
    this.key        = options?.storageKey ?? 'lynkko_mutation_queue'
    this.maxRetries = options?.maxRetries ?? 3
    this.isBrowser  = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  }

  private read(): PendingMutation[] {
    if (!this.isBrowser) return []
    try {
      return JSON.parse(localStorage.getItem(this.key) ?? '[]')
    } catch {
      return []
    }
  }

  private write(mutations: PendingMutation[]): void {
    if (!this.isBrowser) return
    localStorage.setItem(this.key, JSON.stringify(mutations))
  }

  push(mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retries'>): PendingMutation {
    const entry: PendingMutation = {
      ...mutation,
      id:        crypto.randomUUID(),
      createdAt: Date.now(),
      retries:   0,
    }
    const current = this.read()
    this.write([...current, entry])
    return entry
  }

  remove(id: string): void {
    this.write(this.read().filter(m => m.id !== id))
  }

  incrementRetry(id: string): void {
    this.write(this.read().map(m =>
      m.id === id ? { ...m, retries: m.retries + 1 } : m,
    ))
  }

  /** Retorna todas las mutaciones pendientes que aún tienen reintentos disponibles. */
  getAll(): PendingMutation[] {
    return this.read().filter(m => m.retries < this.maxRetries)
  }

  /** Retorna mutaciones que superaron el límite de reintentos (fallidas definitivamente). */
  getFailed(): PendingMutation[] {
    return this.read().filter(m => m.retries >= this.maxRetries)
  }

  count(): number {
    return this.getAll().length
  }

  clear(): void {
    this.write([])
  }
}

// ─── Service Worker helper ────────────────────────────────────────────────────

export interface RegisterSwOptions {
  /** Path al SW file. Default: '/sw.js' */
  swPath?: string
  /** Scope del SW. Default: '/' */
  scope?:  string
  /** Callback al activarse una nueva versión. */
  onUpdate?: (registration: ServiceWorkerRegistration) => void
}

/**
 * Registra el Service Worker de la app.
 * Llama en el root layout o en _app.tsx.
 *
 * @example
 * // app/layout.tsx  (client component)
 * 'use client'
 * import { registerServiceWorker } from '@lynkko/offline-sync'
 * import { useEffect } from 'react'
 *
 * export default function RootLayout({ children }) {
 *   useEffect(() => {
 *     registerServiceWorker({
 *       swPath: '/sw.js',
 *       onUpdate: (reg) => console.log('Nueva versión disponible'),
 *     })
 *   }, [])
 *   return <html>{children}</html>
 * }
 */
export async function registerServiceWorker(
  options?: RegisterSwOptions,
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const reg = await navigator.serviceWorker.register(
      options?.swPath ?? '/sw.js',
      { scope: options?.scope ?? '/' },
    )

    reg.addEventListener('updatefound', () => {
      const worker = reg.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated' && navigator.serviceWorker.controller) {
          options?.onUpdate?.(reg)
        }
      })
    })

    return reg
  } catch (err) {
    console.error('[@lynkko/offline-sync] SW registration failed:', err)
    return null
  }
}

/**
 * Plantilla de Service Worker para cacheo offline.
 * Copiar como `public/sw.js` en tu app Next.js y ajustar las rutas.
 *
 * @example
 * // public/sw.js — pegar el contenido de SW_TEMPLATE
 */
export const SW_TEMPLATE = `
const CACHE = 'lynkko-v1'
const OFFLINE_ROUTES = ['/', '/offline']
const STATIC_ASSETS = ['/offline', '/_next/static']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_ROUTES))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request).then(r => r ?? caches.match('/offline')))
  )
})
`.trim()

