'use client'

import { useTransition } from 'react'
import { toggleTenantApp } from './actions'
import type { LynkkoAppId } from '@lynkko/platform'

interface Props {
  tenantId: string
  appId: LynkkoAppId
  enabled: boolean
}

export function ToggleAppAction({ tenantId, appId, enabled }: Props) {
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(() => toggleTenantApp(tenantId, appId, !enabled))
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        enabled ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
