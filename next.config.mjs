/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'rhun.io',
            port: '',
            pathname: '/images/**/**'
          },
          {
            protocol: 'https',
            hostname: 'rhun-app.vercel.app',
            port: '',
            pathname: '/images/**/**'
          },
          {
            protocol: 'https',
            hostname: 'd1olseq3j3ep4p.cloudfront.net',
            port: '',
            pathname: '/agents/**/**'

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
