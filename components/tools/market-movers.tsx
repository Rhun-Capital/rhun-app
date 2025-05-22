import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, GlobeIcon } from '@/components/icons';
import Link from 'next/link';
import CopyButton from '@/components/copy-button';

interface CoinData {
  symbol: string;
  image: string;
  name: string;
  price: number;
  priceChange24h: number;
  id?: string;
}

interface CoinDetails {
  id: string;
  symbol: string;
  name: string;
  description: { en: string };
  platforms: Record<string, string>;
  contracts: Record<string, { decimal_place: number | null; contract_address: string }>;
  market_data: {
    current_price: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    market_cap: { usd: number };
    total_volume: { usd: number };
    circulating_supply: number;
    total_supply: number;
    high_24h: { usd: number };
    low_24h: { usd: number };
  };
  image: {
    large: string;
  };
  links: {
    homepage: string[];
    twitter_screen_name: string;
  };
  last_updated: string;
}

interface ToolInvocation {
  toolName: string;
  args: { message: string };
  result?: {
    top_gainers: CoinData[];
    top_losers: CoinData[];
  };
}

interface MarketMoversProps {
  toolCallId: string;
  toolInvocation: ToolInvocation;
}

const MarketMovers: React.FC<MarketMoversProps> = ({ toolCallId, toolInvocation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<CoinDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (toolInvocation.toolName !== 'getMarketMovers') return null;

  const formatPrice = (price: number) => (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price)
  );

  const formatPriceChange = (priceChange: number) => (
    `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`
  );

  const handleCoinClick = async (coinId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tools/coin/${coinId}`);
      if (!response.ok) throw new Error('Failed to fetch coin details');
      setSelectedCoin(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCoinCard = (coin: CoinData) => (
    <div 
      key={coin.symbol + Math.random()} 
      className="bg-zinc-900 p-4 sm:p-6 rounded-lg flex items-center justify-between cursor-pointer hover:border-indigo-400 hover:shadow-lg border border-zinc-900"
      onClick={() => coin.id && handleCoinClick(coin.id)}
    >
      <div className="flex items-center gap-3">
        <Image 
          src={coin.image} 
          alt={coin.name} 
          width={32} 
          height={32} 
          className="rounded-full"
        />
        <div>
          <p className="font-medium text-white">{coin.name}</p>
          <p className="text-sm text-zinc-400">{coin.symbol.toUpperCase()}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-white">
          {formatPrice(coin.price)}
        </p>
        <p className={`text-sm ${coin.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {formatPriceChange(coin.priceChange24h)}
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg text-center text-zinc-400">Loading...</div>;
  }

  if (selectedCoin) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg space-y-4">
        <button 
          onClick={() => setSelectedCoin(null)}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ChevronLeftIcon />
          Back
        </button>

        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
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
          <div className="sm:text-right">
            <div className="text-xl sm:text-2xl font-bold">
              {formatPrice(selectedCoin.market_data.current_price.usd)}
            </div>
            <div className={`text-sm ${
              selectedCoin.market_data.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {formatPriceChange(selectedCoin.market_data.price_change_percentage_24h)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: '24h', value: selectedCoin.market_data.price_change_percentage_24h },
            { label: '7d', value: selectedCoin.market_data.price_change_percentage_7d },
            { label: '30d', value: selectedCoin.market_data.price_change_percentage_30d }
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-zinc-500">{label}</div>
              <div className={`text-xs sm:text-sm ${value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPriceChange(value)}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          {[
            { label: 'Market Cap', value: formatPrice(selectedCoin.market_data.market_cap.usd) },
            { label: '24h Volume', value: formatPrice(selectedCoin.market_data.total_volume.usd) },
            { label: 'Circulating Supply', value: selectedCoin.market_data.circulating_supply.toLocaleString() },
            { label: 'Total Supply', value: selectedCoin.market_data.total_supply?.toLocaleString() || 'N/A' }
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-zinc-500">{label}</div>
              <div className="text-sm sm:text-base font-semibold truncate">{value}</div>
            </div>
          ))}
        </div>

        {selectedCoin.description?.en && (
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">About</h3>
            <div 
              className="text-xs sm:text-sm text-zinc-400 line-clamp-4"
              dangerouslySetInnerHTML={{ __html: selectedCoin.description.en }}
            />
          </div>
        )}

        {selectedCoin.platforms && Object.keys(selectedCoin.platforms).length > 0 && Object.keys(selectedCoin.platforms)[0] !== '' && (
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">Contract Addresses</h3>
            <div className="space-y-2">
              {Object.entries(selectedCoin.platforms).map(([platform, address]) => 
                address && (
                  <div key={platform} className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-zinc-500 capitalize mb-1">{platform}</div>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="text-xs sm:text-sm font-mono text-zinc-300 break-all">
                        {address}
                      </div>
                      <CopyButton text={address} />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center mt-4 pt-4 border-t border-zinc-700">
          <div className="text-xs text-zinc-500">
            Last updated: {new Date(selectedCoin.last_updated).toLocaleString()}
          </div>
          <div className="flex gap-4">
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
    <div className="space-y-4">
      <div className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-full' : 'max-h-96'
      }`}>
        <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Top Gainers</h3>
          <p className="mb-4 text-white">Click the token for more details like the contract address, price, market cap and more.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            {toolInvocation.result?.top_gainers.map(renderCoinCard)}
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Top Losers</h3>
          <p className="mb-4 text-white">Click the token for more details like the contract address, price, market cap and more.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            {toolInvocation.result?.top_losers.map(renderCoinCard)}
          </div>
        </div>

        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent" />
        )}
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-1 p-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        {isExpanded ? (
          <>Show Less <ChevronUpIcon /></>
        ) : (
          <>Show More <ChevronDownIcon /></>
        )}
      </button>
    </div>
  );
};

export default MarketMovers;