'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleAppActiveAction, toggleAppMarketplaceAction } from './actions'

type App = {
  id: string
  isActive: boolean
  showInMarketplace: boolean
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      title={label}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
    </button>
  )
}

export function AppToggles({ app }: { app: App }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function toggleActive(value: boolean) {
    startTransition(async () => {
      await toggleAppActiveAction(app.id, value)
      router.refresh()
    })
  }

  function toggleMarketplace(value: boolean) {
    startTransition(async () => {
      await toggleAppMarketplaceAction(app.id, value)
      router.refresh()
    })
  }

  return (
    <div className={`flex items-center gap-4 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-1.5">
        <Toggle checked={app.isActive} onChange={toggleActive} label="Habilitar/deshabilitar app" />
        <span className="text-xs text-muted-foreground">Activa</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Toggle checked={app.showInMarketplace} onChange={toggleMarketplace} label="Mostrar en marketplace" />
        <span className="text-xs text-muted-foreground">Marketplace</span>
      </div>
    </div>
  )
}
