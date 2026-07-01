import { createAuth } from '@lynkko/auth'
import { db } from './db'

function trustedOrigins(): string[] {
  // Lista separada por comas de las apps del ecosistema que pueden usar el SSO,
  // p.ej. "https://turnflow.lynkko.co,https://pec.lynkko.co,https://platform.lynkko.co"
  return (process.env.AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// Lazy singleton — la construcción toca la DB (drizzleAdapter), así que se difiere
// a la primera request para no romper `next build` sin AUTH_DATABASE_URL.
let _auth: ReturnType<typeof createAuth> | null = null

export function getAuthInstance() {
  if (!_auth) {
    _auth = createAuth({
      db,
      appName: 'Lynkko',
      baseUrl: process.env.NEXT_PUBLIC_APP_URL,
      // SSO del ecosistema: la sesión creada en auth.lynkko.co es válida en todos
      // los subdominios *.lynkko.co (mismo eTLD+1 → cookie con scope de dominio).
      crossSubDomainCookies: { domain: process.env.AUTH_COOKIE_DOMAIN ?? '.lynkko.co' },
      trustedOrigins: trustedOrigins(),
      socialProviders: { google: {} }, // se activa solo si hay GOOGLE_CLIENT_ID/SECRET
    })
  }
  return _auth
}
