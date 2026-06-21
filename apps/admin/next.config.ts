import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // better-auth returns complex generic types that break isolatedModules inference
  typescript: { ignoreBuildErrors: true },
  transpilePackages: [
    '@lynkko/auth',
    '@lynkko/db',
    '@lynkko/email',
    '@lynkko/platform',
    '@lynkko/utils',
  ],
}

export default nextConfig
