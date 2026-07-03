const services = {
  audit: {
    url: process.env.AUDIT_URL?.replace(/\/$/, ''),
    key: process.env.AUDIT_API_KEY,
  },
  notifications: {
    url: process.env.NOTIFICATIONS_URL?.replace(/\/$/, ''),
    key: process.env.NOTIFICATIONS_API_KEY,
  },
  auth: {
    url: process.env.AUTH_URL?.replace(/\/$/, ''),
    key: process.env.AUTH_SERVICE_API_KEY,
  },
  comms: {
    url: process.env.COMMS_URL?.replace(/\/$/, ''),
    key: process.env.COMMS_API_KEY,
  },
}

const tenantId = process.env.CERTIFICATION_TENANT_ID
const userId = process.env.CERTIFICATION_USER_ID ?? 'certification-user'
const smokeEmailTo = process.env.COMMS_SMOKE_TO

const missing = [
  ...Object.entries(services).flatMap(([name, service]) => {
    const keys = []
    if (!service.url) keys.push(`${name.toUpperCase()}_URL`)
    if (!service.key) keys.push(name === 'auth' ? 'AUTH_SERVICE_API_KEY' : `${name.toUpperCase()}_API_KEY`)
    return keys
  }),
  ...(!tenantId ? ['CERTIFICATION_TENANT_ID'] : []),
]

if (missing.length > 0) {
  console.error(`Missing ${missing.join(', ')}`)
  process.exit(1)
}

async function request(serviceName, path, init = {}) {
  const service = services[serviceName]
  const res = await fetch(`${service.url}${path}`, {
    ...init,
    redirect: 'manual',
    headers: {
      authorization: `Bearer ${service.key}`,
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
    throw new Error(`[${serviceName}] ${path} returned ${res.status}${redirectMessage}: ${text}`)
  }
  console.log(`[${serviceName}] ${path} ${res.status}`)
  return body
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function hasExpectedAudit(entry) {
  return entry?.action === 'certification.smoke' && entry?.resource === 'platform_certification' && entry?.tenantId === tenantId
}

function hasExpectedNotification(notification) {
  return notification?.title === 'Certification smoke' && notification?.userId === userId && notification?.tenantId === tenantId
}

await request('audit', '/api/health')
const createdAudit = await request('audit', '/api/audit', {
  method: 'POST',
  body: JSON.stringify({
    tenantId,
    appId: 'platform',
    userId,
    action: 'certification.smoke',
    resource: 'platform_certification',
    resourceId: tenantId,
    metadata: { source: 'scripts/certification/smoke-services.mjs' },
  }),
})
assert(createdAudit?.id || hasExpectedAudit(createdAudit), 'Created audit entry is missing id or expected action/resource/tenantId')
const auditResults = await request('audit', `/api/audit?tenantId=${encodeURIComponent(tenantId)}&action=${encodeURIComponent('certification.smoke')}`)
assert(Array.isArray(auditResults?.items), 'Audit search response is missing items array')
assert(
  auditResults.items.some((entry) => (
    createdAudit?.id
      ? entry?.id === createdAudit.id
      : hasExpectedAudit(entry)
  )),
  'Audit search response does not contain created certification smoke entry',
)

await request('notifications', '/api/health')
const createdNotification = await request('notifications', '/api/notifications', {
  method: 'POST',
  body: JSON.stringify({
    tenantId,
    userId,
    appId: 'platform',
    title: 'Certification smoke',
    body: 'Notifications service accepted a certification smoke notification.',
    type: 'system',
  }),
})
assert(createdNotification?.id || hasExpectedNotification(createdNotification), 'Created notification is missing id or expected title/userId/tenantId')
const notificationsResults = await request('notifications', `/api/notifications?tenantId=${encodeURIComponent(tenantId)}&userId=${encodeURIComponent(userId)}`)
assert(Array.isArray(notificationsResults?.items), 'Notifications search response is missing items array')
assert(
  notificationsResults.items.some((notification) => (
    createdNotification?.id
      ? notification?.id === createdNotification.id
      : hasExpectedNotification(notification)
  )),
  'Notifications search response does not contain created certification smoke notification',
)
const unreadCount = await request('notifications', `/api/notifications/unread-count?tenantId=${encodeURIComponent(tenantId)}&userId=${encodeURIComponent(userId)}`)
assert(typeof unreadCount?.count === 'number', 'Notifications unread-count response is missing numeric count')

await request('auth', '/api/health')
const membership = await request('auth', '/api/memberships', {
  method: 'POST',
  body: JSON.stringify({
    tenantId,
    userId,
    appId: 'platform',
    role: 'certification',
  }),
})
assert(membership?.id, 'Auth membership upsert response is missing id')
const memberships = await request('auth', `/api/memberships?userId=${encodeURIComponent(userId)}`)
assert(Array.isArray(memberships?.memberships), 'Auth memberships response is missing memberships array')
assert(
  memberships.memberships.some((row) => row?.tenantId === tenantId && row?.appId === 'platform'),
  'Auth memberships response does not include certification membership',
)

await request('comms', '/api/health')
const messages = await request('comms', `/api/messages?tenantId=${encodeURIComponent(tenantId)}&limit=1`)
assert(Array.isArray(messages?.messages), 'Comms messages response is missing messages array')

if (smokeEmailTo) {
  const sent = await request('comms', '/api/send', {
    method: 'POST',
    body: JSON.stringify({
      tenantId,
      appId: 'platform',
      channel: 'email',
      to: smokeEmailTo,
      subject: 'Lynkko certification smoke',
      title: 'Certification smoke',
      content: 'Comms service accepted a certification smoke email.',
      idempotencyKey: `certification:${tenantId}:${Date.now()}`,
    }),
  })
  assert(sent?.id && sent?.channel === 'email', 'Comms send response is missing id/channel')
} else {
  console.log('[comms] /api/send skipped; set COMMS_SMOKE_TO to send a real certification email')
}
