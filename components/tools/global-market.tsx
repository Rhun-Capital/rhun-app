import React from 'react';
import { GlobalMarketProps } from '@/types/market';
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';

const GlobalMarket: React.FC<GlobalMarketProps> = ({ toolCallId, toolInvocation }) => {
  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading global market data...</div>;
  }

  const {
    totalMarketCap,
    totalVolume,
    marketCapPercentage,
    marketCapChange24h,
    activeCryptocurrencies,
    lastUpdated
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
      <h3 className="text-lg font-semibold text-white mb-4">Global Market Overview</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-zinc-800/30 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total Market Cap</div>
          <div className="text-lg font-medium text-white">{formatNumber(totalMarketCap)}</div>
          <div className={`text-sm ${marketCapChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercentage(marketCapChange24h)}
          </div>
        </div>

        <div className="bg-zinc-800/30 rounded-lg p-4">
          <div className="text-sm text-zinc-400">24h Volume</div>
          <div className="text-lg font-medium text-white">{formatNumber(totalVolume)}</div>
        </div>

        <div className="bg-zinc-800/30 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Active Cryptocurrencies</div>
          <div className="text-lg font-medium text-white">{activeCryptocurrencies.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Market Cap Distribution</h4>
        <div className="space-y-2">
          {Object.entries(marketCapPercentage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([symbol, percentage]) => (
              <div key={symbol} className="flex items-center justify-between">
                <div className="text-sm text-white">{symbol.toUpperCase()}</div>
                <div className="text-sm text-zinc-400">{percentage.toFixed(1)}%</div>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-4 text-xs text-zinc-500 text-right">
        Last updated: {new Date(lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default GlobalMarket; 