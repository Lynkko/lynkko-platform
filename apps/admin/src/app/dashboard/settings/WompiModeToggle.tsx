'use client'

import { useState, useTransition } from 'react'
import { setWompiModeAction } from './actions'

export function WompiModeToggle({ initialMode }: { initialMode: 'test' | 'production' }) {
  const [mode, setMode] = useState<'test' | 'production'>(initialMode)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isProd = mode === 'production'

  function switchTo(next: 'test' | 'production') {
    if (next === mode || pending) return
    if (next === 'production' && !confirm('¿Activar PRODUCCIÓN? A partir de ahora los cobros usan dinero real.')) return
    setError(null)
    startTransition(async () => {
      try {
        await setWompiModeAction(next)
        setMode(next)
      } catch (e) {
        setError((e as Error).message || 'No se pudo cambiar el modo')
      }
    })
  }

  return (
    <div>
      <div className="inline-flex rounded-lg border border-border bg-muted p-1">
        <button
          type="button"
          onClick={() => switchTo('test')}
          disabled={pending}
          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
            !isProd ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pruebas
        </button>
        <button
          type="button"
          onClick={() => switchTo('production')}
          disabled={pending}
          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
            isProd ? 'bg-red-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Producción
        </button>
      </div>

      <div className="mt-3 text-sm">
        {isProd ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-red-600">
            <span className="h-2 w-2 rounded-full bg-red-600" /> Producción activa — cobros reales
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-600">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Modo pruebas (sandbox) — sin cobros reales
          </span>
        )}
        {pending && <span className="ml-2 text-muted-foreground">guardando…</span>}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
