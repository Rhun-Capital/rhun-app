// components/tools/StockAnalysis.tsx
// This component displays stock analysis data and automatically fetches and appends
// the complete financial analysis data from DynamoDB when the analysis is complete.
// It uses the /api/financial-data/complete endpoint to get the full data
// and appends the analysis to the chat using the append prop.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSearchParams } from 'next/navigation';
import type { Message, CreateMessage } from 'ai';
import { StockAnalysisProps } from '@/types/market';
import { LineChart, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { TechnicalAnalysisItem, FundamentalAnalysisItem } from '../../types/analysis';

const StockAnalysis: React.FC<StockAnalysisProps> = ({ 
  toolCallId, 
  toolInvocation, 
  append,
  className = ''
}) => {
  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading stock analysis...</div>;
  }

  const { 
    symbol,
    price,
    change,
    changePercent,
    volume,
    marketCap,
    peRatio,
    dividendYield,
    technicalAnalysis,
    fundamentalAnalysis
  } = toolInvocation.result;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change: number) => {
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}`;
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatVolume = (volume: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(volume);
  };

  return (
    <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">{symbol}</h3>
          <div className="text-sm text-zinc-400 mt-1">Stock Analysis</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{formatPrice(price)}</div>
          <div className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatChange(change)} ({formatPercent(changePercent)})
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-800/30 rounded-lg p-3">
          <div className="text-sm text-zinc-400">Volume</div>
          <div className="text-lg font-medium text-white">{formatVolume(volume)}</div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-3">
          <div className="text-sm text-zinc-400">Market Cap</div>
          <div className="text-lg font-medium text-white">{formatVolume(marketCap)}</div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-3">
          <div className="text-sm text-zinc-400">P/E Ratio</div>
          <div className="text-lg font-medium text-white">{peRatio.toFixed(2)}</div>
        </div>
        <div className="bg-zinc-800/30 rounded-lg p-3">
          <div className="text-sm text-zinc-400">Dividend Yield</div>
          <div className="text-lg font-medium text-white">{formatPercent(dividendYield)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Technical Analysis
          </h4>
          <div className="space-y-4">
            {technicalAnalysis.map((analysis: TechnicalAnalysisItem, index: number) => (
              <div key={index} className="bg-zinc-800/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-white">{analysis.indicator}</div>
                  <div className={`text-sm ${
                    analysis.signal === 'buy' ? 'text-green-500' :
                    analysis.signal === 'sell' ? 'text-red-500' :
                    'text-yellow-500'
                  }`}>
                    {analysis.signal.toUpperCase()}
                  </div>
                </div>
                <div className="text-sm text-zinc-400">{analysis.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Fundamental Analysis
          </h4>
          <div className="space-y-4">
            {fundamentalAnalysis.map((analysis: FundamentalAnalysisItem, index: number) => (
              <div key={index} className="bg-zinc-800/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-white">{analysis.metric}</div>
                  <div className={`text-sm ${
                    analysis.assessment === 'positive' ? 'text-green-500' :
                    analysis.assessment === 'negative' ? 'text-red-500' :
                    'text-yellow-500'
                  }`}>
                    {analysis.assessment.toUpperCase()}
                  </div>
                </div>
                <div className="text-sm text-zinc-400">{analysis.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAnalysis;