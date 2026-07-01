import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@lynkko/db', '@lynkko/notifications', '@lynkko/utils'],
}

export default nextConfig
