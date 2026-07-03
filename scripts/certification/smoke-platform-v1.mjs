const baseUrl = process.env.PLATFORM_API_URL?.replace(/\/$/, '')
const apiKey = process.env.PLATFORM_API_KEY
const tenantId = process.env.CERTIFICATION_TENANT_ID

if (!baseUrl || !apiKey || !tenantId) {
  console.error('Missing PLATFORM_API_URL, PLATFORM_API_KEY, or CERTIFICATION_TENANT_ID')
  process.exit(1)
}

async function request(path, init = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    redirect: 'manual',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    const location = res.headers.get('location')
    const redirectMessage = location ? ` redirect=${location}` : ''
    throw new Error(`${path} returned ${res.status}${redirectMessage}: ${text}`)
  }
  console.log(`[platform] ${path} ${res.status}`)
  return body
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

await request(`/api/v1/license?tenant_id=${encodeURIComponent(tenantId)}`)
await request(`/api/v1/subscription?tenant_id=${encodeURIComponent(tenantId)}`)
await request(`/api/v1/tenants/${encodeURIComponent(tenantId)}`)
await request(`/api/v1/invoices?tenant_id=${encodeURIComponent(tenantId)}`)
await request(`/api/v1/usage?tenant_id=${encodeURIComponent(tenantId)}`)
const usageResult = await request(`/api/v1/usage?tenant_id=${encodeURIComponent(tenantId)}`, {
  method: 'POST',
  body: JSON.stringify({ metrics: { certification_smoke: 1 } }),
})
assert(
  typeof usageResult?.metrics_recorded === 'number' || usageResult?.status === 'ok',
  'Usage smoke response is missing numeric metrics_recorded or status ok',
)
