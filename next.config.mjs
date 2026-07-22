/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Clean URL for the static SME/ID walkthrough in public/
      { source: '/walkthrough', destination: '/walkthrough.html' },
    ]
  },
}
export default nextConfig
