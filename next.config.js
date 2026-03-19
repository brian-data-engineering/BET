/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Replace this with your actual Render URL
    NEXT_PUBLIC_API_URL: 'https://lucra-backend.onrender.com',
  },
  // This helps prevent CORS issues during development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://lucra-backend.onrender.com/:path*',
      },
    ];
  },
}

module.exports = nextConfig
