import { Card, CardContent, CardHeader, CardTitle } from '@lynkko/ui'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Configuración</h1>
      <p className="text-muted-foreground text-sm mb-8">Ajustes globales de Lynkko Platform</p>

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
  )
}
