import React, { useState } from 'react';
import { ChevronLeftIcon, AlertCircleIcon, GlobeIcon } from '@/components/icons';
import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

interface Coin {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number;
  thumb: string;
  large: string;
  contractAddress?: string;
  platforms?: Record<string, string>;
}

interface CoinDetail {
  id: string;
  name: string;
  symbol: string;
  description: { en: string };
  platforms: Record<string, string>;
  market_data: {
    current_price: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    market_cap: { usd: number };
    total_volume: { usd: number };
    circulating_supply: number;
    total_supply: number;
  };
  image: {
    large: string;
  };
  links: {
    homepage: string[];
    twitter_screen_name: string;
  };
  market_cap_rank: number;
  last_updated: string;
}

const SearchResults: React.FC<{ toolCallId: string; toolInvocation: any }> = ({ toolCallId, toolInvocation }) => {
  const [selectedCoin, setSelectedCoin] = useState<CoinDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = usePrivy();

  const handleCoinClick = async (coinId: string) => {
    setIsLoading(true);
    setError(null);
    const accessToken = await getAccessToken();
    try {
      const response = await fetch(`/api/tools/coin/${coinId}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch coin details');
      const data = await response.json();
      setSelectedCoin(data);
    } catch (err) {
      setError('Failed to load coin details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return 'N/A';
    return price.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  const formatPercentage = (percentage: number | undefined) => {
    if (percentage === undefined) return 'N/A';
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg">
        <div className="text-center text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (selectedCoin) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg space-y-4">
        {/* Header with back button */}
        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={() => setSelectedCoin(null)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeftIcon />
            Back to results
          </button>
        </div>

        {/* Coin header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <Image
              src={selectedCoin.image.large}
              alt={selectedCoin.name}
              width={48}
              height={48}
              className="rounded-full"
            />
            <div>
              <h2 className="text-xl font-bold">{selectedCoin.name}</h2>
              <p className="text-zinc-400">{selectedCoin.symbol.toUpperCase()}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {formatPrice(selectedCoin.market_data.current_price.usd)}
            </div>
            <div className={`text-sm ${
              selectedCoin.market_data.price_change_percentage_24h >= 0 
                ? 'text-green-500' 
                : 'text-red-500'
            }`}>
              {formatPercentage(selectedCoin.market_data.price_change_percentage_24h)}
            </div>
          </div>
        </div>

        {/* Price changes grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-500">24h</div>
            <div className={`text-sm ${
              selectedCoin.market_data.price_change_percentage_24h >= 0 
                ? 'text-green-500' 
                : 'text-red-500'
            }`}>
              {formatPercentage(selectedCoin.market_data.price_change_percentage_24h)}
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-500">7d</div>
            <div className={`text-sm ${
              selectedCoin.market_data.price_change_percentage_7d >= 0 
                ? 'text-green-500' 
                : 'text-red-500'
            }`}>
              {formatPercentage(selectedCoin.market_data.price_change_percentage_7d)}
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-500">30d</div>
            <div className={`text-sm ${
              selectedCoin.market_data.price_change_percentage_30d >= 0 
                ? 'text-green-500' 
                : 'text-red-500'
            }`}>
              {formatPercentage(selectedCoin.market_data.price_change_percentage_30d)}
            </div>
          </div>
        </div>

        {/* Market data grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-500">Market Cap</div>
            <div className="text-lg font-semibold">
              {formatPrice(selectedCoin.market_data.market_cap.usd)}
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-500">24h Volume</div>
            <div className="text-lg font-semibold">
              {formatPrice(selectedCoin.market_data.total_volume.usd)}
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-500">Circulating Supply</div>
            <div className="text-lg font-semibold">
              {selectedCoin.market_data.circulating_supply.toLocaleString()}
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-500">Total Supply</div>
            <div className="text-lg font-semibold">
              {selectedCoin.market_data.total_supply?.toLocaleString() || 'N/A'}
            </div>
          </div>
        </div>

        {/* Description */}
        {selectedCoin.description?.en && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">About</h3>
            <div 
              className="text-sm text-zinc-400"
              dangerouslySetInnerHTML={{ __html: selectedCoin.description.en }}
            />
          </div>
        )}

        {/* Platform Information */}
        {selectedCoin.platforms && Object.keys(selectedCoin.platforms).length > 0 && Object.keys(selectedCoin.platforms)[0] !== '' && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Contract Addresses</h3>
            <div className="space-y-2">
              {Object.entries(selectedCoin.platforms).map(([platform, address]) => (
                address && (
                  <div key={platform} className="bg-zinc-900 p-4 rounded-lg">
                    <div className="text-sm text-zinc-500 capitalize mb-1">{platform}</div>
                    <div className="text-sm font-mono text-zinc-300 break-all">
                      {address}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}        

        {/* Links and last updated */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-700">
          <div className="text-xs text-zinc-500">
            Last updated: {new Date(selectedCoin.last_updated).toLocaleString()}
          </div>
          <div className="flex gap-4">
            {selectedCoin.links.homepage[0] && (
              <Link 
                href={selectedCoin.links.homepage[0]}
                target="_blank"
                className="text-zinc-400 hover:text-zinc-300"
              >
                <GlobeIcon />
              </Link>
            )}
            {selectedCoin.links.twitter_screen_name && (
              <Link 
                href={`https://x.com/${selectedCoin.links.twitter_screen_name}`}
                target="_blank"
                className="text-zinc-400 hover:text-zinc-300"
              >
                <Image src="/images/social/x-logo.svg" alt="X Platform" width={15} height={15} />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={toolCallId} className="p-6 bg-zinc-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Search Results</h3>
      <div className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircleIcon />
            {error}
          </div>
        )}
        
        {"result" in toolInvocation && toolInvocation.result.coins.map((coin: Coin) => (
          <div 
            key={coin.id} 
            className="flex items-center border border-zinc-900 justify-between p-3 bg-zinc-900 rounded-lg transition-all duration-200 ease-in-out
                           hover:border-indigo-400 hover:shadow-lg transition-colors cursor-pointer"
            onClick={() => handleCoinClick(coin.id)}
          >
            <div className="flex items-center gap-3">
              {coin.thumb ? (
                <img 
                  src={coin.thumb} 
                  alt={coin.name} 
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                  N/A
                </div>
              )}
              <div>
                <div className="font-medium">{coin.name}</div>
                <div className="text-sm text-zinc-400">
                  {coin.symbol.toUpperCase()}
                </div>
              </div>
            </div>
            {coin.marketCapRank && (
              <div className="text-right">
                <div className="text-sm text-zinc-400">
                  Rank #{coin.marketCapRank}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {"result" in toolInvocation && toolInvocation.result.coins.length === 0 && (
          <div className="text-zinc-400 text-center py-4">
            No results found
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;