'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleOfferingAction } from './actions'

type App = {
  id: string
  name: string
  isActive: boolean
  showInMarketplace: boolean
}

type Offering = {
  hostAppId: string
  guestAppId: string
  isEnabled: boolean
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
    </button>
  )
}

export function MarketplaceClient({ apps, offerings }: { apps: App[]; offerings: Offering[] }) {
  const [tab, setTab] = useState<'visibility' | 'matrix'>('visibility')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function isEnabled(hostAppId: string, guestAppId: string) {
    return offerings.find(o => o.hostAppId === hostAppId && o.guestAppId === guestAppId)?.isEnabled ?? false
  }

  function handleOffering(hostAppId: string, guestAppId: string, value: boolean) {
    startTransition(async () => {
      await toggleOfferingAction(hostAppId, guestAppId, value)
      router.refresh()
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
        <p className="text-muted-foreground text-sm mt-1">Configura qué aparece en el marketplace de cada aplicación</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setTab('visibility')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'visibility' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Visibilidad del marketplace
        </button>
        <button
          onClick={() => setTab('matrix')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'matrix' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Integraciones disponibles
        </button>
      </div>

      {tab === 'visibility' && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-6 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aplicación — ¿tiene sección de marketplace?</p>
          </div>
          <div className="divide-y divide-border">
            {apps.map(app => (
              <div key={app.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{app.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{app.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {app.showInMarketplace ? 'Marketplace visible' : 'Sin marketplace'}
                  </span>
                  <Toggle
                    checked={app.showInMarketplace}
                    onChange={(v) => {
                      startTransition(async () => {
                        const { toggleAppMarketplaceAction } = await import('../apps/actions')
                        await toggleAppMarketplaceAction(app.id, v)
                        router.refresh()
                      })
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'matrix' && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Para cada app (fila), selecciona qué otras apps se ofrecen en su marketplace para integración.
          </p>
          <div className={`rounded-lg border border-border bg-card overflow-auto ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">App anfitriona</th>
                  {apps.map(guest => (
                    <th key={guest.id} className="px-3 py-3 text-center text-xs font-medium text-muted-foreground">
                      {guest.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {apps.map(host => (
                  <tr key={host.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{host.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{host.id}</p>
                    </td>
                    {apps.map(guest => (
                      <td key={guest.id} className="px-3 py-3 text-center">
                        {host.id === guest.id ? (
                          <span className="text-muted-foreground/30">—</span>
                        ) : (
                          <Toggle
                            checked={isEnabled(host.id, guest.id)}
                            onChange={(v) => handleOffering(host.id, guest.id, v)}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
