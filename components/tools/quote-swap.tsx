import React from 'react';
import { Quote, MarketInfo } from '@/types/market';
import { QuoteSwapProps } from '@/types/components';
import { ArrowDownUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const QuoteSwap: React.FC<QuoteSwapProps> = ({ toolCallId, toolInvocation }) => {
  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading swap quote...</div>;
  }

  const { inAmount, outAmount, priceImpact, marketInfos } = toolInvocation.result;

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(num);
  };

  const formatPercentage = (percent: string) => {
    const num = parseFloat(percent);
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Swap Quote</h3>
      
      <div className="space-y-4">
        <div className="bg-zinc-800/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-zinc-400">Input Amount</div>
            <div className="font-medium text-white">{formatAmount(inAmount)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">Output Amount</div>
            <div className="font-medium text-white">{formatAmount(outAmount)}</div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-sm text-zinc-400">Price Impact</div>
            <div className={`text-sm ${parseFloat(priceImpact) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(priceImpact)}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-zinc-400 mb-2">Available Routes</h4>
          <div className="space-y-2">
            {marketInfos.map((info: MarketInfo, index: number) => (
              <div key={info.id} className="bg-zinc-800/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-white">{info.label}</div>
                  <div className={`text-sm ${info.notEnoughLiquidity ? 'text-red-500' : 'text-green-500'}`}>
                    {info.notEnoughLiquidity ? 'Insufficient Liquidity' : 'Available'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-zinc-400">Input</div>
                    <div className="text-white">{formatAmount(info.inAmount)}</div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Output</div>
                    <div className="text-white">{formatAmount(info.outAmount)}</div>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-zinc-400">Price Impact</div>
                    <div className={`${info.priceImpactPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentage(info.priceImpactPct.toString())}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-zinc-400">Liquidity Fee</div>
                    <div className="text-white">{formatPercentage(info.liquidityFee.toString())}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-zinc-400">Platform Fee</div>
                    <div className="text-white">{formatPercentage(info.platformFee.toString())}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteSwap; 