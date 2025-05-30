// components/market-categories.tsx
import React, { useState } from 'react';
import Image from 'next/image';
import { Category, MarketCategoriesProps } from '@/types/market';

const MarketCategories: React.FC<MarketCategoriesProps> = ({ toolCallId, toolInvocation }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading market categories...</div>;
  }

  const categories = Object.values(toolInvocation.result);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const renderTopCoins = (coinUrls: string[], categoryId: number) => (
    <div key={categoryId} className="flex items-center gap-1.5 mt-2">
      {coinUrls.map((url, i) => (
        <Image
          key={i}
          src={url}
          alt={`Top coin ${i + 1}`}
          width={20}
          height={20}
          className="rounded-full"
        />
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-lg font-semibold text-white mb-4">Top Crypto Categories</h2>
      <div className="space-y-2">
        {categories.map((category: Category, index: number) => (
          <div
            key={category.id}
            className="bg-zinc-900 hover:bg-zinc-800/90 transition-colors rounded-lg p-4"
            onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-white mb-1">{category.name}</h3>
                <span className={category.change24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {formatPercentage(category.change24h)}
                </span>
                {category.topCoins && category.topCoins.length > 0 && (
                  renderTopCoins(category.topCoins, index)
                )}
              </div>
              <div className="text-right">
                <div className="text-white font-medium mb-1">
                  {formatNumber(category.marketCap)}
                </div>
                <div className="text-zinc-500 text-sm">
                  Vol: {formatNumber(category.volume24h)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketCategories;