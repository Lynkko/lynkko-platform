'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@lynkko/ui'
import { authClient } from '@/lib/auth-client'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await authClient.signIn.email({ email, password })
    if (err) {
      setError('Credenciales inválidas')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <form onSubmit={onSubmit} className="bg-card rounded-lg border border-border p-8 space-y-4 shadow-sm">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Email</label>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@lynkko.co"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Contraseña</label>
        <Input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} size="lg" className="w-full">
        {loading ? 'Ingresando...' : 'Ingresar'}
      </Button>
    </form>
  )
}
