/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/n8n/:path*',
        destination: 'https://n8n.valueinmath.com/:path*',
      },
    ];
  },
}

export default nextConfig
