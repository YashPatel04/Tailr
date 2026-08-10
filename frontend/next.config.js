/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    const backend = process.env.INTERNAL_API_URL || "http://localhost:8000"
    return [
      {
        source: "/api/auth/:path*",
        destination: `${backend}/api/auth/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
