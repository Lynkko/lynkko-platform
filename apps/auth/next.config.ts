import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@lynkko/auth', '@lynkko/db', '@lynkko/utils'],
}

export default nextConfig
