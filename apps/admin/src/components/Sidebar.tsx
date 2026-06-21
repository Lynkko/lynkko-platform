'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: '◈' },
  { href: '/dashboard/tenants', label: 'Tenants', icon: '⬡' },
  { href: '/dashboard/apps', label: 'Aplicaciones', icon: '◻' },
  { href: '/dashboard/settings', label: 'Configuración', icon: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 border-r border-slate-200 bg-white flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <span className="text-xs font-bold tracking-widest text-violet-600 uppercase">Lynkko</span>
        <p className="text-xs text-slate-400 mt-0.5">Platform Admin</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-violet-50 text-violet-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">Superadmin</p>
      </div>
    </aside>
  )
}
