/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    const backend = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
