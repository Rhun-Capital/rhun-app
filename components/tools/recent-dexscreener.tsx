import React from 'react';
import { RecentDexScreenerProps, DexScreenerPair } from '@/types/market';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

const RecentDexScreener: React.FC<RecentDexScreenerProps> = ({ toolCallId, toolInvocation }) => {
  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading recent pairs...</div>;
  }

  const { pairs } = toolInvocation.result;

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(numPrice);
  };

  const formatPriceChange = (change: number) => {
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  const formatVolume = (volume: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(volume);
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Recent DEX Pairs</h3>
      <div className="space-y-4">
        {pairs.map((pair: DexScreenerPair) => (
          <div key={pair.pairAddress} className="bg-zinc-800/30 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-white">
                    {pair.baseToken.symbol}/{pair.quoteToken.symbol}
                  </h4>
                  <Link 
                    href={pair.url} 
                    target="_blank" 
                    className="text-zinc-400 hover:text-zinc-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
                <div className="text-sm text-zinc-400 mt-1">
                  {pair.baseToken.name}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-white">
                  {formatPrice(pair.priceUsd)}
                </div>
                <div className={`text-sm ${pair.priceChange.h24 >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPriceChange(pair.priceChange.h24)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-zinc-400">24h Volume</div>
                <div className="text-sm text-white">{formatVolume(pair.volume.h24)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Liquidity</div>
                <div className="text-sm text-white">{formatVolume(pair.liquidity.usd)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">FDV</div>
                <div className="text-sm text-white">{formatVolume(pair.fdv)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Created</div>
                <div className="text-sm text-white">
                  {new Date(pair.pairCreatedAt * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentDexScreener; 