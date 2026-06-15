'use client'

import Dexie, { type Table } from 'dexie'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { MutationQueue, type PendingMutation, type SyncStatus } from './index'

// ─── Dexie store factory ──────────────────────────────────────────────────────

export interface OfflineStoreSchema {
  [tableName: string]: string  // índices Dexie. Ej: '++id, tenantId, createdAt'
}

/**
 * Crea una base de datos IndexedDB con Dexie para almacenamiento offline.
 *
 * @example
 * // src/lib/offline-db.ts
 * import { createOfflineStore } from '@lynkko/offline-sync/client'
 *
 * export const offlineDb = createOfflineStore('lynkko-pec', {
 *   leads:         '++id, tenantId, stageId, assignedTo, updatedAt',
 *   interactions:  '++id, leadId, tenantId, createdAt',
 *   appointments:  '++id, tenantId, userId, date',
 *   products:      '++id, tenantId, sku',
 * })
 *
 * // Usar como Dexie normal:
 * const leads = await offlineDb.table('leads').where('tenantId').equals(tenantId).toArray()
 */
export function createOfflineStore(
  dbName:  string,
  schema:  OfflineStoreSchema,
  version = 1,
): Dexie {
  const db = new Dexie(dbName)
  db.version(version).stores(schema)
  return db
}

/**
 * Helper tipado para acceder a una tabla del store.
 *
 * @example
 * const leadsTable = getTable<Lead>(offlineDb, 'leads')
 * const all = await leadsTable.toArray()
 */
export function getTable<T>(db: Dexie, tableName: string): Table<T, string> {
  return db.table<T, string>(tableName)
}

// ─── Context de sincronización ────────────────────────────────────────────────

export interface SyncState {
  isOnline:     boolean
  status:       SyncStatus
  pendingCount: number
  lastSynced:   Date | null
  error:        string | null
}

export interface SyncContextValue extends SyncState {
  /** Fuerza una sincronización inmediata. */
  sync: () => Promise<void>
  /** Agrega una operación a la cola de mutaciones. */
  enqueue: (mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retries'>) => void
}

const SyncContext = createContext<SyncContextValue | null>(null)

export interface OfflineSyncProviderProps {
  children:    ReactNode
  queue:       MutationQueue
  /**
   * Función que ejecuta una mutación pendiente contra el servidor.
   * Debe lanzar error si falla (para que la cola reintente).
   *
   * @example
   * async function syncMutation(m) {
   *   await fetch(`/api/${m.resource}`, {
   *     method: m.operation === 'create' ? 'POST' : m.operation === 'update' ? 'PATCH' : 'DELETE',
   *     body: JSON.stringify(m.payload),
   *   }).then(r => { if (!r.ok) throw new Error(r.statusText) })
   * }
   */
  onSync:      (mutation: PendingMutation) => Promise<void>
  /** Intervalo de sync automático en ms cuando hay conexión. Default: 30000 (30s) */
  syncInterval?: number
}

/**
 * Provider de sincronización offline. Montar en el root de la app.
 *
 * @example
 * // app/providers.tsx
 * 'use client'
 * import { OfflineSyncProvider, MutationQueue } from '@lynkko/offline-sync/client'
 *
 * const queue = new MutationQueue()
 *
 * async function syncMutation(m) {
 *   const res = await fetch(`/api/${m.resource}/${m.resourceId}`, {
 *     method: m.operation === 'create' ? 'POST' : 'PATCH',
 *     body: JSON.stringify(m.payload),
 *     headers: { 'Content-Type': 'application/json' },
 *   })
 *   if (!res.ok) throw new Error('sync failed')
 * }
 *
 * export function Providers({ children }) {
 *   return (
 *     <OfflineSyncProvider queue={queue} onSync={syncMutation}>
 *       {children}
 *     </OfflineSyncProvider>
 *   )
 * }
 */
export function OfflineSyncProvider({
  children,
  queue,
  onSync,
  syncInterval = 30_000,
}: OfflineSyncProviderProps) {
  const [state, setState] = useState<SyncState>({
    isOnline:     typeof navigator !== 'undefined' ? navigator.onLine : true,
    status:       'idle',
    pendingCount: queue.count(),
    lastSynced:   null,
    error:        null,
  })

  const refreshCount = useCallback(() => {
    setState(s => ({ ...s, pendingCount: queue.count() }))
  }, [queue])

  const sync = useCallback(async () => {
    const pending = queue.getAll()
    if (pending.length === 0) return

    setState(s => ({ ...s, status: 'syncing', error: null }))

    let hasError = false
    for (const mutation of pending) {
      try {
        await onSync(mutation)
        queue.remove(mutation.id)
      } catch {
        queue.incrementRetry(mutation.id)
        hasError = true
      }
    }

    setState(s => ({
      ...s,
      status:       hasError ? 'error' : 'idle',
      pendingCount: queue.count(),
      lastSynced:   hasError ? s.lastSynced : new Date(),
      error:        hasError ? 'Algunos cambios no pudieron sincronizarse' : null,
    }))
  }, [queue, onSync])

  const enqueue = useCallback(
    (mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retries'>) => {
      queue.push(mutation)
      refreshCount()
    },
    [queue, refreshCount],
  )

  // Listeners de conectividad
  useEffect(() => {
    const onOnline  = () => { setState(s => ({ ...s, isOnline: true,  status: 'idle'    })); sync() }
    const onOffline = () =>   setState(s => ({ ...s, isOnline: false, status: 'offline' }))

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [sync])

  // Auto-sync periódico
  useEffect(() => {
    if (!state.isOnline) return
    const id = setInterval(() => { if (queue.count() > 0) sync() }, syncInterval)
    return () => clearInterval(id)
  }, [state.isOnline, sync, queue, syncInterval])

  return (
    <SyncContext.Provider value={{ ...state, sync, enqueue }}>
      {children}
    </SyncContext.Provider>
  )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Hook principal para interactuar con el estado de sincronización.
 *
 * @example
 * const { isOnline, pendingCount, enqueue, sync } = useOfflineSync()
 *
 * // Al guardar un lead sin conexión:
 * if (!isOnline) {
 *   enqueue({ operation: 'create', resource: 'lead', resourceId: tempId, payload: lead })
 *   showToast('Guardado localmente. Se sincronizará al recuperar conexión.')
 * }
 */
export function useOfflineSync(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useOfflineSync debe usarse dentro de <OfflineSyncProvider>')
  return ctx
}

/**
 * Hook simple para saber si hay conexión y cuántos cambios están pendientes.
 * Versión liviana que no requiere el Provider.
 *
 * @example
 * const { isOnline, pendingCount } = useSyncStatus()
 *
 * // En el layout:
 * {!isOnline && <OfflineBanner pendingCount={pendingCount} />}
 */
export function useSyncStatus(): Pick<SyncState, 'isOnline' | 'pendingCount' | 'lastSynced'> {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const ctx = useContext(SyncContext)
  return {
    isOnline,
    pendingCount: ctx?.pendingCount ?? 0,
    lastSynced:   ctx?.lastSynced  ?? null,
  }
}

// ─── Re-exports del entry universal ──────────────────────────────────────────

export { MutationQueue, registerServiceWorker, SW_TEMPLATE } from './index'
export type { PendingMutation, SyncStatus, MutationQueueOptions } from './index'
