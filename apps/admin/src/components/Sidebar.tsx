'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard',              label: 'Inicio',        icon: '◈' },
  { href: '/dashboard/tenants',      label: 'Tenants',        icon: '⬡' },
  { href: '/dashboard/apps',         label: 'Aplicaciones',  icon: '◻' },
  { href: '/dashboard/plans',        label: 'Planes',         icon: '⬟' },
  { href: '/dashboard/marketplace',  label: 'Marketplace',    icon: '◑' },
  { href: '/dashboard/billing',      label: 'Billing',        icon: '◉' },
  { href: '/dashboard/reports',      label: 'Reportes',       icon: '▤' },
  { href: '/dashboard/settings',     label: 'Configuración',  icon: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 border-r border-border bg-card flex flex-col">
      <div className="p-6 border-b border-border">
        <span className="text-xs font-bold tracking-widest text-primary uppercase">Lynkko</span>
        <p className="text-xs text-muted-foreground mt-0.5">Platform Admin</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-primary-50 text-primary-900 font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">Superadmin</p>
      </div>
    </aside>
  )
}
