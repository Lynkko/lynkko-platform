import { toNextJsHandler, getAuthInstance } from '@/lib/auth'

// Construir el handler perezosamente: acceder a auth.handler en module scope
// dispara createDb() y hace fallar `next build` cuando no hay PLATFORM_DATABASE_URL
// (p.ej. previews de Vercel). Se difiere a la primera request.
let handlers: ReturnType<typeof toNextJsHandler> | null = null
function getHandlers() {
  if (!handlers) handlers = toNextJsHandler(getAuthInstance().handler)
  return handlers
}

export async function GET(request: Request) {
  return getHandlers().GET(request)
}

export async function POST(request: Request) {
  return getHandlers().POST(request)
}
