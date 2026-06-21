import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@lynkko/auth',
    '@lynkko/db',
    '@lynkko/email',
    '@lynkko/platform',
    '@lynkko/utils',
  ],
}

export default nextConfig
