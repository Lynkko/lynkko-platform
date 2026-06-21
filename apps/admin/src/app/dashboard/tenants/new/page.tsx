import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@lynkko/ui'
import Link from 'next/link'
import { CreateTenantForm } from './CreateTenantForm'

export default function NewTenantPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/dashboard/tenants" className="text-sm text-muted-foreground hover:text-foreground">
          ← Tenants
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">Nuevo Tenant</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del tenant</CardTitle>
          <CardDescription>Registra una nueva marca u organización en el ecosistema Lynkko</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTenantForm />
        </CardContent>
      </Card>
    </div>
  )
}
