import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@lynkko/db', '@lynkko/audit', '@lynkko/utils'],
}

export default nextConfig
