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
        },
        {
          protocol: 'https',
          hostname: 'raw.githubusercontent.com',
          port: '',
          pathname: '/solana-labs/token-list/main/assets/mainnet/**/**'
        },
        {
          protocol: 'https',
          hostname: '*.ipfs.nftstorage.link',
          port: '',
          pathname: '*'
        },
        {
          protocol: 'https',
          hostname: '424565.fs1.hubspotusercontent-na1.net',
          port: '',
          pathname: '/**/**'
        },
        {
          protocol: 'https',
          hostname: 'storage.googleapis.com',
          port: '',
          pathname: '/**/**'
        },
        {
          protocol: 'https',
          hostname: 'static.jup.ag',
          port: '',
          pathname: '/**/**'
        },
        {
          protocol: 'https',
          hostname: 'arweave.net',
          port: '',
          pathname: '/**'
        },
        {
          protocol: 'https',
          hostname: 'cf-ipfs.com',
          port: '',
          pathname: '/**/**'
        },
        {
          protocol: 'https',
          hostname: 'i.ibb.co',
          port: '',
          pathname: '/**/**'
        },
        {
          protocol: 'https',
          hostname: 'cloudflare-ipfs.com',
          port: '',
          pathname: '/**/**'
        },
        {
          protocol: 'https',
          hostname: 'raw.githubusercontent.com',
          port: '',
          pathname: '/**/**/**/**/**'
        },
        {
          protocol: 'https',
          hostname: 'gateway.irys.xyz',
          port: '',
          pathname: '/**'
        },
        {
          protocol: 'https',
          hostname: 'gateway.pinata.cloud',
          port: '',
          pathname: '/**'
        },
        {
          protocol: 'https',
          hostname: 'ipfs.io',
          port: '',
          pathname: '/**/**'
        },
        {
          protocol: 'https',
          hostname: 'metadata.jito.network',
          port: '',
          pathname: '/**/**/**'
        },
        {
          protocol: 'https',
          hostname: 'img.fotofolio.xyz',
          port: '',
          pathname: '/**'
        },
        {
          protocol: 'https',
          hostname: 'shdw-drive.genesysgo.net',
          port: '',
          pathname: '/**/**'
        },
        {
          protocol: "https",
          hostname: "*"
        },
        {
          protocol: "http",
          hostname: "*"
        },
        {
          protocol: "https",
          hostname: "bafkreihmnbzlnzod2x6abcoxyyqbm5mjccwihkvdjo2jwbxkztihpnhksa"
        }
      ]
    }
};

export default nextConfig;
