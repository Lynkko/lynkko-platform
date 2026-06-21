'use client'

import { useTransition } from 'react'
import { cancelSubscriptionAction } from './actions'

interface Props {
  tenantId:       string
  subscriptionId: string
}

export function CancelSubscriptionButton({ tenantId, subscriptionId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handle() {
    if (!confirm('¿Cancelar esta suscripción?')) return
    startTransition(() => cancelSubscriptionAction(tenantId, subscriptionId))
  }

  return (
    <button
      onClick={handle}
      disabled={isPending}
      className="text-xs text-destructive hover:underline disabled:opacity-50"
    >
      {isPending ? 'Cancelando...' : 'Cancelar'}
    </button>
  )
}
