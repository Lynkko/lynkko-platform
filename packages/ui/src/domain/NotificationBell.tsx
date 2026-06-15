'use client'

import { type ButtonHTMLAttributes } from 'react'
import { cn } from '../utils'

export interface NotificationBellProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Cantidad de notificaciones no leídas. 0 = sin badge. */
  count?:     number
  /** Tamaño del ícono. Default: 'md' */
  size?:      'sm' | 'md' | 'lg'
}

const SIZE = {
  sm: { btn: 'h-7 w-7', icon: 'h-4 w-4', badge: 'h-3.5 w-3.5 text-[9px]' },
  md: { btn: 'h-9 w-9', icon: 'h-5 w-5', badge: 'h-4 w-4 text-[10px]'   },
  lg: { btn: 'h-10 w-10', icon: 'h-6 w-6', badge: 'h-5 w-5 text-xs'     },
}

/**
 * Campana de notificaciones con badge de conteo.
 * Conectar con el conteo de `@lynkko/notifications`.
 *
 * @example
 * import { useEffect, useState } from 'react'
 * import { NotificationBell } from '@lynkko/ui'
 *
 * export function NavBar() {
 *   const [count, setCount] = useState(0)
 *
 *   useEffect(() => {
 *     fetch('/api/notifications/unread-count')
 *       .then(r => r.json())
 *       .then(d => setCount(d.count))
 *   }, [])
 *
 *   return <NotificationBell count={count} onClick={() => setDrawerOpen(true)} />
 * }
 */
export function NotificationBell({ count = 0, size = 'md', className, ...props }: NotificationBellProps) {
  const s = SIZE[size]
  const display = count > 99 ? '99+' : count > 0 ? String(count) : null

  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex items-center justify-center rounded-md text-muted-foreground',
        'transition-colors hover:bg-muted hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        s.btn,
        className,
      )}
      aria-label={count > 0 ? `${count} notificaciones sin leer` : 'Notificaciones'}
      {...props}
    >
      {/* Bell SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={s.icon}
        aria-hidden
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>

      {display && (
        <span className={cn(
          'absolute right-0.5 top-0.5 flex items-center justify-center rounded-full',
          'bg-destructive text-destructive-foreground font-bold leading-none',
          s.badge,
        )}>
          {display}
        </span>
      )}
    </button>
  )
}
