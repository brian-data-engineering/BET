/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.betika.com'], // In case you pull team logos later
  },
  async rewrites() {
    return [
      {
        // This lets you call /api/matches instead of the full Render URL
        source: '/api/:path*',
        destination: 'https://lucra-data.onrender.com/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
