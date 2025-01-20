// components/market-categories.tsx
import React from 'react';
import Image from 'next/image';

interface Category {
  id: string;
  name: string;
  marketCap: number;
  volume24h: number;
  topCoins: string[];
  change24h: number;
}

interface MarketCategoriesProps {
  toolCallId: string;
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: Category[];
  };
}

const MarketCategories: React.FC<MarketCategoriesProps> = ({ toolCallId, toolInvocation }) => {
  if (!("result" in toolInvocation) || !toolInvocation.result) return null;

  const formatNumber = (num: number) => {
    if (num > 1_000_000_000_000) {
      return `$${(num / 1_000_000_000_000).toFixed(2)}T`;
    }
    if (num > 1_000_000_000) {
      return `$${(num / 1_000_000_000).toFixed(2)}B`;
    }
    if (num > 1_000_000) {
      return `$${(num / 1_000_000).toFixed(2)}M`;
    }
    return `$${num.toLocaleString()}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  return (
    <div className="p-6 bg-zinc-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Top Crypto Categories</h3>
      
      <div className="space-y-4">
        {toolInvocation.result.map((category) => (
          <div key={category.id} className="bg-zinc-900 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium">{category.name}</h4>
                <div className={`text-sm ${
                  category.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {formatPercentage(category.change24h)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  {formatNumber(category.marketCap)}
                </div>
                <div className="text-sm text-zinc-400">
                  Vol: {formatNumber(category.volume24h)}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {category.topCoins.map((coinUrl, index) => {
                // Extract coin name from URL for alt text
                const coinName = coinUrl.split('/').pop() || `coin-${index}`;
                return (
                  <div key={coinUrl} className="relative">
                    <Image
                      src={coinUrl}
                      alt={coinName}
                      width={20}
                      height={20}
                      className="rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketCategories;