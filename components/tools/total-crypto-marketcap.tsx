// components/global-market-cap.tsx
import React from 'react';
import { GlobalMarketProps } from '@/types/components';

const TotalCryptoMarketCap: React.FC<GlobalMarketProps> = ({ 
  toolCallId, 
  toolInvocation,
  className = '' 
}) => {
  // Show loading state for both 'call' and 'partial-call' states
  if (toolInvocation.state !== 'result' || !toolInvocation.result) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg">
        <div className="text-zinc-400">Loading market data...</div>
      </div>
    );
  }

  const {
    totalMarketCap = 0,
    totalVolume = 0,
    marketCapPercentage = {},
    marketCapChange24h = 0,
    activeCryptocurrencies = 0,
    lastUpdated
  } = toolInvocation.result;

  const formatNumber = (num: number) => {
    if (num > 1_000_000_000_000) {
      return `$${(num / 1_000_000_000_000).toFixed(2)}T`;
    }
    if (num > 1_000_000_000) {
      return `$${(num / 1_000_000_000).toFixed(2)}B`;
    }
    return `$${num.toLocaleString()}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const formatMarketShare = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  const sortedMarketShare = Object.entries(marketCapPercentage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className={`p-6 bg-zinc-800 rounded-lg space-y-6 ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Total Market Cap</h3>
          <div className="text-2xl font-bold text-white">
            {formatNumber(totalMarketCap)}
          </div>
          <div className={`text-sm ${marketCapChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercentage(marketCapChange24h)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-zinc-400">Active Cryptocurrencies</div>
          <div className="text-lg font-semibold text-white">
            {activeCryptocurrencies.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-4 rounded-lg">
          <div className="text-sm text-zinc-400">24h Volume</div>
          <div className="text-lg font-semibold text-white">
            {formatNumber(totalVolume)}
          </div>
        </div>
        <div className="bg-zinc-900 p-4 rounded-lg">
          <div className="text-sm text-zinc-400">Market Share</div>
          <div className="text-sm space-y-1">
            {sortedMarketShare.map(([symbol, percentage]) => (
              <div key={symbol} className="flex justify-between text-white">
                <span className="uppercase">{symbol}</span>
                <span>{formatMarketShare(percentage)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className="text-xs text-zinc-500">
          Last updated: {new Date(lastUpdated * 1000).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default TotalCryptoMarketCap;