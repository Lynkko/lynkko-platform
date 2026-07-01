import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@lynkko/comms',
    '@lynkko/db',
    '@lynkko/email',
    '@lynkko/push',
    '@lynkko/utils',
  ],
}

export default nextConfig
