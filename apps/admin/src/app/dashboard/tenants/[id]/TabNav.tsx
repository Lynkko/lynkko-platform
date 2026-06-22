'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { key: 'apps',           label: 'Aplicaciones' },
  { key: 'modules',        label: 'Módulos' },
  { key: 'subscriptions',  label: 'Suscripciones' },
  { key: 'billing',        label: 'Facturación' },
  { key: 'usage',          label: 'Uso' },
  { key: 'brand',          label: 'Marca' },
]

export function TabNav({ activeTab }: { activeTab: string }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-0 border-b border-border mb-6">
      {TABS.map(({ key, label }) => (
        <Link
          key={key}
          href={`${pathname}?tab=${key}`}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
