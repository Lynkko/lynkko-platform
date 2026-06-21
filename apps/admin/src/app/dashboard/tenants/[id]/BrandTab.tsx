'use client'

import { useTransition } from 'react'
import type { TenantAppAccess, LynkkoAppId, AppTheme } from '@lynkko/platform'
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@lynkko/ui'
import { updateThemeAction } from './actions'

const APP_NAMES: Record<string, string> = {
  pec:        'Lynkko App (PEC)',
  turnflow:   'Turnflow by Lynkko',
  clubpass:   'ClubPass by Lynkko',
  incentivos: 'Lynkko Incentivos',
  pqrs:       'Lynkko PQRS',
  help:       'Lynkko Help',
}

interface Props {
  tenantId: string
  accesses: TenantAppAccess[]
}

export function BrandTab({ tenantId, accesses }: Props) {
  const enabled = accesses.filter((a) => a.isEnabled)

  if (enabled.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Marca</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Habilita al menos una app para configurar el tema de marca.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {enabled.map((access) => (
        <ThemeEditor
          key={access.appId}
          tenantId={tenantId}
          appId={access.appId as LynkkoAppId}
          appName={APP_NAMES[access.appId] ?? access.appId}
          theme={(access.theme as AppTheme) ?? null}
        />
      ))}
    </div>
  )
}

function ThemeEditor({
  tenantId, appId, appName, theme
}: {
  tenantId: string
  appId: LynkkoAppId
  appName: string
  theme: AppTheme | null
}) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => updateThemeAction(tenantId, appId, fd))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{appName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Color primario</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  name="primaryPicker"
                  defaultValue={theme?.primary ?? '#166534'}
                  className="h-9 w-12 rounded border border-input cursor-pointer"
                  onChange={(e) => {
                    const hex = document.getElementById(`primary-${appId}`) as HTMLInputElement
                    if (hex) hex.value = e.target.value
                  }}
                />
                <Input
                  id={`primary-${appId}`}
                  name="primary"
                  defaultValue={theme?.primary ?? '#166534'}
                  pattern="#[0-9a-fA-F]{6}"
                  required
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nombre de la app</label>
              <Input name="appName" defaultValue={theme?.appName ?? ''} placeholder={appName} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">URL del logo</label>
              <Input name="logoUrl" type="url" defaultValue={theme?.logoUrl ?? ''} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Radio de bordes</label>
              <select
                name="borderRadius"
                defaultValue={theme?.borderRadius ?? 'md'}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="none">Sin redondeo</option>
                <option value="sm">Pequeño</option>
                <option value="md">Mediano</option>
                <option value="lg">Grande</option>
                <option value="full">Completo</option>
              </select>
            </div>
          </div>

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar tema'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
