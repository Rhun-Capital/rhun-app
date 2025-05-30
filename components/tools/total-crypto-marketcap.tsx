// components/global-market-cap.tsx
import React from 'react';
import { GlobalMarketData } from '@/types/market';
import { GlobalMarketProps } from '../../types/ui';

const TotalCryptoMarketCap: React.FC<GlobalMarketProps> = ({ toolCallId, toolInvocation }) => {
  if (!("result" in toolInvocation)) return null;

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

  const topCoins = Object.entries(toolInvocation.result?.marketCapPercentage || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="p-6 bg-zinc-800 rounded-lg space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Total Market Cap</h3>
          <div className="text-2xl font-bold text-white">
            {formatNumber(toolInvocation.result?.totalMarketCap || 0)}
          </div>
          <div className={`text-sm ${
            (toolInvocation.result?.marketCapChange24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {formatPercentage(toolInvocation.result?.marketCapChange24h || 0)}
          </div>
        </div>
        <div className="text-right w-1/2">
          <div className="text-sm text-zinc-400">Active Cryptocurrencies</div>
          <div className="text-lg font-semibold text-white">
            {toolInvocation.result?.activeCryptocurrencies.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-4 rounded-lg">
          <div className="text-sm text-zinc-400">24h Volume</div>
          <div className="text-lg font-semibold text-white">
            {formatNumber(toolInvocation.result?.totalVolume || 0)}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm text-zinc-400 mb-2">Market Dominance</h4>
        <div className="space-y-2">
          {topCoins.map(([symbol, percentage]) => (
            <div key={symbol} className="flex justify-between items-center">
              <div className="text-sm font-medium text-white">{symbol.toUpperCase()}</div>
              <div className="text-sm text-white">{percentage.toFixed(2)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-zinc-500">
        Last updated: {new Date((toolInvocation.result?.lastUpdated || 0) * 1000).toLocaleString()}
      </div>
    </div>
  );
};

export default TotalCryptoMarketCap;