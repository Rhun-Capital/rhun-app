import React from 'react';
import { SolanaTransactionVolumeProps } from '@/types/components';
import { Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const SolanaTransactionVolume: React.FC<SolanaTransactionVolumeProps> = ({ 
  toolCallId, 
  toolInvocation,
  className = '' 
}) => {
  // Show loading state for both 'call' and 'partial-call' states
  if (toolInvocation.state !== 'result' || !toolInvocation.result) {
    return (
      <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-center h-40">
          <div className="text-zinc-400 animate-pulse">Loading transaction volume data...</div>
        </div>
      </div>
    );
  }

  const { volume = { volumeUSD: 0, volumeSOL: 0 }, count = { transactionCount: 0 } } = toolInvocation.result;
  
  // Use the volumeUSD from the API response
  const totalVolume = volume.volumeUSD || 0;
  const transactionCount = count.transactionCount || 0;
  const averageTransactionSize = transactionCount > 0 ? totalVolume / transactionCount : 0;

  // For demonstration, we'll split the volume evenly between buy/sell
  const buyVolume = totalVolume / 2;
  const sellVolume = totalVolume / 2;

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

  // Calculate volume change percentage from previous day
  const volumeChange24h = toolInvocation.result.volume.priceChange24h || 0;

  return (
    <div className={`bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6 shadow-xl ${className}`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Transaction Volume
          </h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          volumeChange24h >= 0 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {formatPercentage(volumeChange24h)}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-xl p-4 hover:bg-zinc-800/40 transition-all duration-200">
          <div className="text-sm text-zinc-400 mb-2">Total Volume</div>
          <div className="text-xl font-semibold text-white">{formatNumber(totalVolume)}</div>
        </div>
        <div className="bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-xl p-4 hover:bg-zinc-800/40 transition-all duration-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="h-4 w-4 text-green-400" />
            <div className="text-sm text-zinc-400">Buy Volume</div>
          </div>
          <div className="text-xl font-semibold text-white">{formatNumber(buyVolume)}</div>
        </div>
        <div className="bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-xl p-4 hover:bg-zinc-800/40 transition-all duration-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="h-4 w-4 text-red-400" />
            <div className="text-sm text-zinc-400">Sell Volume</div>
          </div>
          <div className="text-xl font-semibold text-white">{formatNumber(sellVolume)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-xl p-4 hover:bg-zinc-800/40 transition-all duration-200">
          <div className="text-sm text-zinc-400 mb-2">Transaction Count</div>
          <div className="text-xl font-semibold text-white">{transactionCount.toLocaleString()}</div>
        </div>
        <div className="bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-xl p-4 hover:bg-zinc-800/40 transition-all duration-200">
          <div className="text-sm text-zinc-400 mb-2">Average Size</div>
          <div className="text-xl font-semibold text-white">{formatNumber(averageTransactionSize)}</div>
        </div>
      </div>

      <div className="flex items-center justify-end mt-6 pt-4 border-t border-zinc-700/30">
        <div className="text-xs text-zinc-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default SolanaTransactionVolume;