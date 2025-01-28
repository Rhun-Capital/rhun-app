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

  const handleCoinClick = async (coinId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tools/coin/${coinId}`, {
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch coin details');
      setSelectedCoin(await response.json());
    } catch (err) {
      setError('Failed to load coin details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg text-center text-zinc-400">Loading...</div>;
  }

  if (selectedCoin) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg space-y-4">
        {/* Back button */}
        <button 
          onClick={() => setSelectedCoin(null)}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ChevronLeftIcon />
          Back
        </button>

        {/* Coin header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between items-start sm:items-center">
          <div className="flex items-center gap-3">
            <Image
              src={selectedCoin.image.large}
              alt={selectedCoin.name}
              width={40}
              height={40}
              className="rounded-full sm:w-12 sm:h-12"
            />
            <div>
              <h2 className="text-lg sm:text-xl font-bold">{selectedCoin.name}</h2>
              <p className="text-sm text-zinc-400">{selectedCoin.symbol.toUpperCase()}</p>
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="text-xl sm:text-2xl font-bold">
              {formatPrice(selectedCoin.market_data.current_price.usd)}
            </div>
            <div className={`text-sm ${selectedCoin.market_data.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(selectedCoin.market_data.price_change_percentage_24h)}
            </div>
          </div>
        </div>

        {/* Price changes */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: '24h', value: selectedCoin.market_data.price_change_percentage_24h },
            { label: '7d', value: selectedCoin.market_data.price_change_percentage_7d },
            { label: '30d', value: selectedCoin.market_data.price_change_percentage_30d }
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-zinc-500">{label}</div>
              <div className={`text-xs sm:text-sm ${value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(value)}
              </div>
            </div>
          ))}
        </div>

        {/* Market data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          {[
            { label: 'Market Cap', value: formatPrice(selectedCoin.market_data.market_cap.usd) },
            { label: '24h Volume', value: formatPrice(selectedCoin.market_data.total_volume.usd) },
            { label: 'Circulating Supply', value: selectedCoin.market_data.circulating_supply.toLocaleString() },
            { label: 'Total Supply', value: selectedCoin.market_data.total_supply?.toLocaleString() || 'N/A' }
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-zinc-500">{label}</div>
              <div className="text-sm sm:text-lg font-semibold truncate">{value}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        {selectedCoin.description?.en && (
          <div className="mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold mb-2">About</h3>
            <div 
              className="text-xs sm:text-sm text-zinc-400 max-w-full sm:max-w-[500px] line-clamp-4 sm:line-clamp-none"
              dangerouslySetInnerHTML={{ __html: selectedCoin.description.en }}
            />
          </div>
        )}

        {/* Contract Addresses */}
        {selectedCoin.platforms && Object.keys(selectedCoin.platforms).length > 0 && Object.keys(selectedCoin.platforms)[0] !== '' && (
          <div className="mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold mb-2">Contract Addresses</h3>
            <div className="space-y-2">
              {Object.entries(selectedCoin.platforms).map(([platform, address]) => 
                address && (
                  <div key={platform} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-zinc-500 capitalize mb-1">{platform}</div>
                    <div className="text-xs sm:text-sm font-mono text-zinc-300 break-all">
                      {address}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}        

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center mt-4 pt-4 border-t border-zinc-700">
          <div className="text-xs text-zinc-500 order-2 sm:order-1">
            Last updated: {new Date(selectedCoin.last_updated).toLocaleString()}
          </div>
          <div className="flex gap-4 order-1 sm:order-2">
            {selectedCoin.links.homepage[0] && (
              <Link href={selectedCoin.links.homepage[0]} target="_blank" className="text-zinc-400 hover:text-zinc-300">
                <GlobeIcon />
              </Link>
            )}
            {selectedCoin.links.twitter_screen_name && (
              <Link href={`https://x.com/${selectedCoin.links.twitter_screen_name}`} target="_blank" className="text-zinc-400 hover:text-zinc-300">
                <Image src="/images/social/x-logo.svg" alt="X" width={15} height={15} />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg">
      <h3 className="text-base sm:text-lg font-semibold mb-2">Search Results</h3>
      <p className="mb-4">Click the token for more details like the contract address, price, market cap and more.</p>

      <div className="space-y-2 sm:space-y-3">
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircleIcon />
            {error}
          </div>
        )}
        
        {"result" in toolInvocation && toolInvocation.result.coins.map((coin: Coin) => (
          <div 
            key={coin.id} 
            className="flex items-center border border-zinc-900 justify-between p-3 bg-zinc-900 rounded-lg 
                     hover:border-indigo-400 hover:shadow-lg cursor-pointer w-full sm:w-[300px]"
            onClick={() => handleCoinClick(coin.id)}
          >
            <div className="flex items-center gap-3 min-w-0">
              {coin.thumb ? (
                <img src={coin.thumb} alt={coin.name} className="w-8 h-8 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400 flex-shrink-0">
                  N/A
                </div>
              )}
              <div className="min-w-0">
                <div className="font-medium truncate">{coin.name}</div>
                <div className="text-sm text-zinc-400 truncate">{coin.symbol.toUpperCase()}</div>
              </div>
            </div>
            {coin.marketCapRank && (
              <div className="text-right flex-shrink-0">
                <div className="text-xs sm:text-sm text-zinc-400">
                  #{coin.marketCapRank}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {"result" in toolInvocation && toolInvocation.result.coins.length === 0 && (
          <div className="text-sm text-zinc-400 text-center py-4">
            No results found
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;