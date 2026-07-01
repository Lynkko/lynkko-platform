import { toNextJsHandler } from '@lynkko/auth'
import { getAuthInstance } from '@/lib/auth'

// Handler perezoso: construir en module scope dispara la init de DB de Better Auth
// y rompe `next build` sin AUTH_DATABASE_URL. Se difiere a la primera request.
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
