import { NextRequest, NextResponse } from 'next/server'

// Rutas públicas: login + API externas (autenticadas con Bearer token en el handler)
const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/apps/',
  '/api/subscriptions/',
  '/api/marketplace/',
  '/api/cron/',
  '/api/webhooks/',
  '/api/invoices',
  '/api/tenants/',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  const sessionToken =
    req.cookies.get('better-auth.session_token')?.value ??
    req.cookies.get('__Secure-better-auth.session_token')?.value

  if (!isPublic && !sessionToken) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
