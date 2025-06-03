import React from 'react';
import Image from 'next/image';
import { NftCollectionProps } from '@/types/nft';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

const NftCollection: React.FC<NftCollectionProps> = ({ toolCallId, toolInvocation }) => {
  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading NFT collection data...</div>;
  }

  const {
    collectionName,
    floorPrice,
    volume24h,
    volumeChange24h,
    holders,
    sales24h,
    marketCap,
    imageUrl,
    description,
    website,
    twitter,
    discord
  } = toolInvocation.result;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-start gap-4 mb-6">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={collectionName}
            width={80}
            height={80}
            className="rounded-lg"
          />
        )}
        <div>
          <h3 className="text-xl font-bold text-white">{collectionName}</h3>
          {description && (
            <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-800/30 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Floor Price</div>
          <div className="text-lg font-medium text-white">{formatNumber(floorPrice)}</div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-4">
          <div className="text-sm text-zinc-400">24h Volume</div>
          <div className="text-lg font-medium text-white">{formatNumber(volume24h)}</div>
          <div className={`text-sm ${volumeChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercentage(volumeChange24h)}
          </div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Market Cap</div>
          <div className="text-lg font-medium text-white">{formatNumber(marketCap)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-800/30 rounded-lg p-3">
          <div className="text-sm text-zinc-400">Holders</div>
          <div className="text-lg font-medium text-white">{holders.toLocaleString()}</div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-3">
          <div className="text-sm text-zinc-400">24h Sales</div>
          <div className="text-lg font-medium text-white">{sales24h.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        {website && (
          <Link 
            href={website} 
            target="_blank" 
            className="text-zinc-400 hover:text-zinc-300"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
        {twitter && (
          <Link 
            href={`https://twitter.com/${twitter}`} 
            target="_blank" 
            className="text-zinc-400 hover:text-zinc-300"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Link>
        )}
        {discord && (
          <Link 
            href={discord} 
            target="_blank" 
            className="text-zinc-400 hover:text-zinc-300"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
};

export default NftCollection; 