import { requireSuperadmin } from '@/lib/session'
import { Sidebar } from '@/components/Sidebar'

// Todo el dashboard es auth-gated (requireSuperadmin lee la sesión de la request)
// y consulta la DB en render → nunca debe prerenderizarse en build. Esto evita que
// `next build` toque la DB (falla en previews sin PLATFORM_DATABASE_URL).
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSuperadmin()

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  )
}
