import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // better-auth returns complex generic types that break isolatedModules inference
  typescript: { ignoreBuildErrors: true },
  transpilePackages: [
    '@lynkko/audit',
    '@lynkko/auth',
    '@lynkko/db',
    '@lynkko/email',
    '@lynkko/notifications',
    '@lynkko/platform',
    '@lynkko/ui',
    '@lynkko/utils',
  ],
}

export default nextConfig
