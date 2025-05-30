import React from 'react';
import { SolanaTransactionVolumeProps } from '@/types/market';
import { Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const SolanaTransactionVolume: React.FC<SolanaTransactionVolumeProps> = ({ 
  toolCallId, 
  toolInvocation 
}) => {
  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading transaction volume data...</div>;
  }

  const { 
    totalVolume,
    buyVolume,
    sellVolume,
    transactionCount,
    averageTransactionSize,
    volumeChange24h,
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
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Transaction Volume</h3>
        <div className={`text-sm ${volumeChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {formatPercentage(volumeChange24h)}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-800/30 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total Volume</div>
          <div className="text-lg font-medium text-white">{formatNumber(totalVolume)}</div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-green-500" />
            <div className="text-sm text-zinc-400">Buy Volume</div>
          </div>
          <div className="text-lg font-medium text-white">{formatNumber(buyVolume)}</div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4 text-red-500" />
            <div className="text-sm text-zinc-400">Sell Volume</div>
          </div>
          <div className="text-lg font-medium text-white">{formatNumber(sellVolume)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-800/30 rounded-lg p-3">
          <div className="text-sm text-zinc-400">Transaction Count</div>
          <div className="text-lg font-medium text-white">{transactionCount.toLocaleString()}</div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-3">
          <div className="text-sm text-zinc-400">Average Size</div>
          <div className="text-lg font-medium text-white">{formatNumber(averageTransactionSize)}</div>
        </div>
      </div>

      <div className="mt-4 text-xs text-zinc-500 text-right">
        Last updated: {new Date(lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default SolanaTransactionVolume;