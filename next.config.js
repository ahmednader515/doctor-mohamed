/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Allow large attachment uploads through the Next.js proxy / route handlers
    proxyClientMaxBodySize: '100mb',
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      bodySizeLimit: '100mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
      },
      {
        protocol: 'https',
        hostname: '7o7q29b8xy.ufs.sh',
      },
      {
        protocol: 'https',
        hostname: '6c8pm9dkvh.ufs.sh',
      },
      {
        protocol: 'https',
        hostname: 'za4fcj06bh.ufs.sh',
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
  serverExternalPackages: ['@prisma/client', 'bcrypt'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig 