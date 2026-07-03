const groups = {
  platform: ['PLATFORM_API_URL', 'PLATFORM_API_KEY'],
  audit: ['AUDIT_URL', 'AUDIT_API_KEY'],
  notifications: ['NOTIFICATIONS_URL', 'NOTIFICATIONS_API_KEY'],
  auth: ['AUTH_URL', 'AUTH_SERVICE_API_KEY'],
  comms: ['COMMS_URL', 'COMMS_API_KEY'],
  certification: ['CERTIFICATION_TENANT_ID', 'CERTIFICATION_USER_ID'],
}

const requestedGroups = process.argv.slice(2)
const selectedGroups = requestedGroups.length > 0 ? requestedGroups : Object.keys(groups)

let failed = false

for (const group of selectedGroups) {
  const keys = groups[group]
  if (!keys) {
    failed = true
    console.error(`[certification:${group}] unknown group`)
    continue
  }

  const missing = keys.filter((key) => !process.env[key])
  if (missing.length > 0) {
    failed = true
    console.error(`[certification:${group}] missing ${missing.join(', ')}`)
  } else {
    console.log(`[certification:${group}] ok`)
  }
}

if (failed) {
  process.exit(1)
}
