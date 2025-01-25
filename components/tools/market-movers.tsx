import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/icons';

interface CoinData {
  symbol: string;
  image: string;
  name: string;
  price: number;
  priceChange24h: number;
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

  if (toolInvocation.toolName !== 'getMarketMovers') return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const formatPriceChange = (priceChange: number) => {
    return `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
  };

  const renderCoinCard = (coin: CoinData) => (
    <div key={coin.symbol + Math.random()} className="bg-zinc-900 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src={coin.image} alt={coin.name} width={20} height={20} />
          <div>
            <p className="text-sm text-zinc-400">{coin.symbol.toUpperCase()}</p>
            <p className="text-xs text-zinc-500">{coin.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{formatPrice(coin.price)}</p>
          <p className={`text-xs ${
            coin.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {formatPriceChange(coin.priceChange24h)}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className={`relative overflow-hidden transition-all duration-300 ease-in-out rounded-lg ${
        isExpanded ? 'max-h-full' : 'max-h-96'
      }`}>
        {/* Gainers Section */}
        <div key={toolCallId} className="p-6 bg-zinc-800 rounded-lg mb-4">
          {toolInvocation.args.message}
          <h3 className="text-lg font-semibold mb-4">Top Gainers</h3>
          <div className="grid grid-cols-2 gap-4">
            {toolInvocation.result && toolInvocation.result.top_gainers.map(renderCoinCard)}
          </div>
        </div>

        {/* Losers Section */}
        <div className="p-6 bg-zinc-800 rounded-lg">
          {toolInvocation.args.message}
          <h3 className="text-lg font-semibold mb-4">Top Losers</h3>
          <div className="grid grid-cols-2 gap-4">
            {toolInvocation.result && toolInvocation.result.top_losers.map(renderCoinCard)}
          </div>
        </div>

        {/* Gradient overlay when content is collapsed */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent" />
        )}
      </div>

      {/* Show more/less button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 p-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        {isExpanded ? (
          <>
            Show Less <ChevronUpIcon />
          </>
        ) : (
          <>
            Show More <ChevronDownIcon />
          </>
        )}
      </button>
    </div>
  );
};

export default MarketMovers;