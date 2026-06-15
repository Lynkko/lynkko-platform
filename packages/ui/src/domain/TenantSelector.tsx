'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '../utils'
import { UserAvatar } from './UserAvatar'

export interface TenantOption {
  id:       string
  name:     string
  logoUrl?: string | null
  plan?:    string
}

export interface TenantSelectorProps {
  current:   TenantOption
  options:   TenantOption[]
  onSelect:  (tenant: TenantOption) => void
  className?: string
}

/**
 * Selector de tenant para apps multi-tenant.
 * Muestra el tenant activo y permite cambiar entre los accesibles.
 *
 * @example
 * <TenantSelector
 *   current={activeTenant}
 *   options={userTenants}
 *   onSelect={(t) => router.push(`/app/${t.id}`)}
 * />
 */
export function TenantSelector({ current, options, onSelect, className }: TenantSelectorProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
            'hover:bg-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
          aria-label="Cambiar empresa"
        >
          <UserAvatar name={current.name} imageUrl={current.logoUrl} size="xs" />
          <span className="max-w-[120px] truncate font-medium">{current.name}</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted-foreground" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[180px] overflow-hidden rounded-md border border-border bg-card p-1 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          align="start"
          sideOffset={4}
        >
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Empresas</p>
          {options.map(tenant => (
            <DropdownMenu.Item
              key={tenant.id}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                'transition-colors hover:bg-muted focus:bg-muted',
                tenant.id === current.id && 'bg-primary/5 text-primary font-medium',
              )}
              onSelect={() => onSelect(tenant)}
            >
              <UserAvatar name={tenant.name} imageUrl={tenant.logoUrl} size="xs" />
              <span className="flex-1 truncate">{tenant.name}</span>
              {tenant.id === current.id && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
