import { db, platformSchema } from '@/lib/db'
import { inArray } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@lynkko/ui'
import { BusinessTypesManager } from './BusinessTypesManager'
import { WompiModeToggle } from './WompiModeToggle'

export default async function SettingsPage() {
  const rows = await db.select()
    .from(platformSchema.platformSettings)
    .where(inArray(platformSchema.platformSettings.key, ['business_types', 'wompi_mode']))

  const businessTypes = (rows.find(r => r.key === 'business_types')?.value ?? []) as { slug: string; label: string }[]
  const wompiModeRaw = rows.find(r => r.key === 'wompi_mode')?.value
  const wompiMode: 'test' | 'production' =
    (typeof wompiModeRaw === 'string' ? wompiModeRaw : (wompiModeRaw as { mode?: string } | null)?.mode) === 'production'
      ? 'production' : 'test'

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Configuración</h1>
      <p className="text-muted-foreground text-sm mb-8">Ajustes globales de Lynkko Platform</p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cobro — modo Wompi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Alterna entre <strong>pruebas (sandbox)</strong> y <strong>producción</strong> para el cobro de TODAS las apps.
              El cambio aplica al instante (portal, guardar-tarjeta, cobros automáticos y webhooks) — no requiere redeploy.
              Producción cobra dinero real.
            </p>
            <WompiModeToggle initialMode={wompiMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipos de negocio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Define los tipos de negocio disponibles en todas las apps del ecosistema. Los cambios se sincronizan con Turnflow en el próximo cron nocturno.
            </p>
            <BusinessTypesManager initial={businessTypes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles y arquitectura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-md bg-primary-50 border border-primary-100 p-4">
              <p className="font-semibold text-primary-900 mb-1">Superadmin (este panel)</p>
              <p>Acceso exclusivo al equipo Lynkko. Gestiona todos los tenants, habilita/deshabilita apps, configura temas y controla el ecosistema completo.</p>
            </div>
            <div className="rounded-md bg-muted border border-border p-4">
              <p className="font-semibold text-foreground mb-1">BrandAdmin (en cada app)</p>
              <p>Rol de administrador de marca dentro de Turnflow, ClubPass, PEC, etc. Gestiona su propio tenant: usuarios, configuración, módulos de su app. No puede acceder a otros tenants.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
