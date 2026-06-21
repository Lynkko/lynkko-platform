import { LoginForm } from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Lynkko Platform</h1>
          <p className="text-sm text-slate-500 mt-1">Acceso exclusivo para el equipo Lynkko</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
