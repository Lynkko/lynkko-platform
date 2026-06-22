'use client'

import { useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@lynkko/ui'
import { toggleModuleAction } from './modules-actions'
import type { PlatformModule, TenantModuleAccess } from '@lynkko/platform'

interface Props {
  tenantId: string
  appId: string
  appName: string
  modules: Array<{
    id: string
    slug: string
    name: string
    description: string | null
  }>
  accesses: TenantModuleAccess[]
}

export function ModulesTab({ tenantId, appId, appName, modules, accesses }: Props) {
  const [isPending, startTransition] = useTransition()

  const accessMap = Object.fromEntries(accesses.map((a) => [a.moduleId, a]))

  function handleToggle(moduleId: string, currentStatus: boolean) {
    startTransition(() => toggleModuleAction(tenantId, moduleId, !currentStatus))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Módulos de {appName}</CardTitle>
        <CardDescription>
          Gestiona qué funcionalidades tiene habilitadas este tenant en {appName}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {modules.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground">
            No hay módulos disponibles para esta aplicación
          </div>
        ) : (
          <div className="divide-y divide-border">
            {modules.map((module) => {
              const access = accessMap[module.id]
              const isEnabled = access?.isEnabled ?? true

              return (
                <div key={module.id} className="flex items-start justify-between px-6 py-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{module.name}</p>
                    {module.description && (
                      <p className="text-xs text-muted-foreground mt-1">{module.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{module.slug}</code>
                      {isEnabled && <Badge variant="success">Habilitado</Badge>}
                      {!isEnabled && <Badge variant="secondary">Deshabilitado</Badge>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(module.id, isEnabled)}
                    disabled={isPending}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 flex-shrink-0 ml-4 ${
                      isEnabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
