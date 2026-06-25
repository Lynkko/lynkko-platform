'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@lynkko/ui'
import { saveBusinessTypesAction } from './actions'

type BusinessType = { slug: string; label: string }

export function BusinessTypesManager({ initial }: { initial: BusinessType[] }) {
  const [types, setTypes] = useState<BusinessType[]>(initial)
  const [newSlug, setNewSlug] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function addType() {
    const slug = newSlug.trim()
    const label = newLabel.trim()
    if (!slug || !label) return
    if (types.some(t => t.slug === slug)) return
    setTypes(prev => [...prev, { slug, label }])
    setNewSlug('')
    setNewLabel('')
  }

  function removeType(slug: string) {
    setTypes(prev => prev.filter(t => t.slug !== slug))
  }

  function moveUp(index: number) {
    if (index === 0) return
    setTypes(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function save() {
    startTransition(async () => {
      await saveBusinessTypesAction(types)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
        {types.map((t, i) => (
          <div key={t.slug} className="flex items-center gap-3 px-4 py-2.5 bg-background hover:bg-muted/30">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveUp(i)} disabled={i === 0} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none">▲</button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs font-mono text-muted-foreground">{t.slug}</p>
            </div>
            <button onClick={() => removeType(t.slug)} className="text-xs text-destructive hover:text-destructive/80 px-2 py-1 rounded">
              Quitar
            </button>
          </div>
        ))}
        {types.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">Sin tipos configurados</p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="slug (ej: farmacia)"
          value={newSlug}
          onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
          className="flex-1"
        />
        <Input
          placeholder="Etiqueta (ej: Farmacia)"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={addType} disabled={!newSlug || !newLabel}>
          Agregar
        </Button>
      </div>

      <Button onClick={save} disabled={isPending}>
        {isPending ? 'Guardando...' : 'Guardar tipos de negocio'}
      </Button>
    </div>
  )
}
