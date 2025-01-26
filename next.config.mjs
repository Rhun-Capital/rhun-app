/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'beta.rhun.io',
            port: '',
            pathname: ['/images/**', '/images/**/**']
          },
          {
            protocol: 'https',
            hostname: 'rhun-app.vercel.app',
            port: '',
            pathname: '/images/**/**'
          },
          {
            protocol: 'https',
            hostname: 'coin-images.coingecko.com',
            port: '',
            pathname: '/coins/images/**/**'
          }
        ]
      },
};

export default nextConfig;
