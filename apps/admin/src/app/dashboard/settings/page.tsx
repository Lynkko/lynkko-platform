export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Configuración</h1>
      <p className="text-slate-500 text-sm mb-8">Ajustes globales de Lynkko Platform</p>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Roles y arquitectura</h2>
        <div className="space-y-4 text-sm text-slate-600">
          <div className="rounded-lg bg-violet-50 border border-violet-100 p-4">
            <p className="font-semibold text-violet-800 mb-1">Superadmin (este panel)</p>
            <p>Acceso exclusivo al equipo Lynkko. Gestiona todos los tenants, habilita/deshabilita apps, configura temas y controla el ecosistema completo.</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
            <p className="font-semibold text-slate-700 mb-1">BrandAdmin (en cada app)</p>
            <p>Rol de administrador de marca dentro de Turnflow, ClubPass, PEC, etc. Gestiona su propio tenant: usuarios, configuración, módulos de su app. No puede acceder a otros tenants.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
