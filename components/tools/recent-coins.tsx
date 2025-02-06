import React, { useState } from 'react';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import { ChevronLeftIcon, AlertCircleIcon, GlobeIcon } from '@/components/icons';
import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import CopyButton from '@/components/copy-button';

interface CoinData {
    id: string;
    name: string;
    symbol: string;
    description: string;
    current_price_usd: number;
    market_cap_usd: number;
    total_volume_usd: number;
    categories: string[];
    last_updated: string;
    score: number;
    thumb?: string;
    small?: string;
    large?: string;
  }
  
  interface ToolInvocation {
    result: CoinData[];
  }

  const RecentCoinsResults: React.FC<{ 
    toolCallId: string; 
    toolInvocation: AIToolInvocation 
}> = ({ toolCallId, toolInvocation }) => {
    const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const detailsRef = React.useRef<HTMLDivElement>(null);


    const coins = ('result' in toolInvocation) ? toolInvocation.result : [];


  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return 'N/A';
    return price.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  const formatMarketCap = (marketCap: number | undefined) => {
    if (marketCap === undefined) return 'N/A';
    return marketCap.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  };

    const handleCointSelect = (coin: CoinData) => {
        setSelectedCoin(coin);
        setTimeout(() => {
            detailsRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);        
    };

  if (selectedCoin) {
    return (
      <div ref={detailsRef} className="p-4 sm:p-6 bg-zinc-800 rounded-lg space-y-4">
        <button 
          onClick={() => setSelectedCoin(null)}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ChevronLeftIcon />
          Back
        </button>

        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between items-start sm:items-center">
          <div className="flex items-center gap-3">
            {selectedCoin.large ? (
              <Image
                src={selectedCoin.large}
                alt={selectedCoin.name}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-base">
                {selectedCoin.symbol[0].toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-bold">{selectedCoin.name}</h2>
              <p className="text-sm text-zinc-400">{selectedCoin.symbol.toUpperCase()}</p>
            </div>
          
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="text-xl sm:text-2xl font-bold">
              {formatPrice(selectedCoin.current_price_usd)}
            </div>
          </div>
        </div>

        {/* Market data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          {[
            { label: 'Market Cap', value: formatMarketCap(selectedCoin.market_cap_usd) },
            { label: '24h Volume', value: formatMarketCap(selectedCoin.total_volume_usd) }
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-zinc-500">{label}</div>
              <div className="text-sm sm:text-lg font-semibold truncate">{value}</div>
            </div>
          ))}
        </div>

        {/* Categories */}
        {selectedCoin.categories && selectedCoin.categories.length > 0 && (
          <div className="mt-4">
            <h3 className="text-base font-semibold mb-2">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {selectedCoin.categories.map(category => (
                <span key={category} className="px-2 py-1 bg-zinc-900 rounded-full text-xs">
                  {category}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {selectedCoin.description && (
          <div className="mt-4">
            <h3 className="text-base font-semibold mb-2">About</h3>
            <p className="text-sm text-zinc-400">{selectedCoin.description}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-700">
          <div className="text-xs text-zinc-500">
            Last updated: {new Date(selectedCoin.last_updated).toLocaleString()}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg">
      <h3 className="text-base sm:text-lg font-semibold mb-2">Recent Coins</h3>
      <p className="mb-4">Click a coin to view more details about market cap, volume, and categories.</p>
  
      {/* Update this container to use grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        {error && (
          <div className="col-span-full flex items-center gap-2 text-red-400 text-sm">
            <AlertCircleIcon />
            {error}
          </div>
        )}
        
        {Array.isArray(coins) && coins.map((coin: CoinData) => (
          <div 
            key={coin.id} 
            className="flex items-center border border-zinc-900 justify-between p-3 bg-zinc-900 rounded-lg 
                     hover:border-indigo-400 hover:shadow-lg cursor-pointer"
            onClick={() => handleCointSelect(coin)}
          >
            <div className="flex items-center gap-3 min-w-0">
              {coin.thumb ? (
                <Image 
                  src={coin.thumb}
                  alt={coin.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                  {coin.symbol[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-medium truncate">{coin.name}</div>
                <div className="text-sm text-zinc-400 truncate">{coin.symbol.toUpperCase()}</div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-medium">
                {formatMarketCap(coin.market_cap_usd)}
              </div>
              <div className="text-xs text-zinc-400">Market Cap</div>
            </div>
          </div>
        ))}
        
        {!Array.isArray(coins) || coins.length === 0 && (
            <div className="col-span-full text-sm text-zinc-400 text-center py-4">
                No coins found
            </div>
        )}
      </div>
    </div>
  );
};


export default RecentCoinsResults;