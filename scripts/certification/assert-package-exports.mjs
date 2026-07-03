const checks = [
  {
    packageName: '@lynkko/platform',
    importPath: '../../packages/platform/dist/index.mjs',
    exports: ['createPlatformHttpClient'],
  },
  {
    packageName: '@lynkko/audit',
    importPath: '../../packages/audit/dist/index.mjs',
    exports: ['createAuditHttpClient'],
  },
  {
    packageName: '@lynkko/notifications',
    importPath: '../../packages/notifications/dist/index.mjs',
    exports: ['createNotificationsHttpClient'],
  },
  {
    packageName: '@lynkko/auth',
    importPath: '../../packages/auth/dist/index.mjs',
    exports: ['createAuth', 'toNextJsHandler'],
  },
  {
    packageName: '@lynkko/comms',
    importPath: '../../packages/comms/dist/index.mjs',
    exports: ['createCommsHttpClient'],
  },
]

let failed = false

for (const check of checks) {
  const mod = await import(new URL(check.importPath, import.meta.url))
  for (const exportName of check.exports) {
    if (typeof mod[exportName] !== 'function') {
      failed = true
      console.error(`[${check.packageName}] missing function export ${exportName}`)
    } else {
      console.log(`[${check.packageName}] ${exportName} ok`)
    }
  }
}

if (failed) {
  process.exit(1)
}
