import React, { useState, useMemo } from 'react';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import {ChevronLeft, ChevronRight, ChevronDown, ChevronUp} from 'lucide-react'
import Image from 'next/image';
import CopyButton from '@/components/copy-button';
import { GlobeIcon } from '@/components/icons';
import Link from 'next/link';
import { RecentCoinsProps, CoinData } from '@/types/market';
import { ToolInvocationState, BaseToolInvocation, ToolInvocationResult, Message } from '../../types/invocation';
import { TableColumn } from '../../types/nft';

const RecentCoinsResults: React.FC<RecentCoinsProps> = ({ toolCallId, toolInvocation }) => {
  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading recent coins...</div>;
  }

  const coins = Object.values(toolInvocation.result);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const formatPriceChange = (change: number) => {
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Recently Added Coins</h3>
      <div className="space-y-4">
        {coins.map((coin: CoinData) => (
          <div key={coin.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src={typeof coin.image === 'string' ? coin.image : coin.image.large}
                alt={coin.name}
                width={32}
                height={32}
                className="rounded-full"
              />
              <div>
                <div className="font-medium text-white">{coin.name}</div>
                <div className="text-sm text-zinc-400">{coin.symbol.toUpperCase()}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-white">{formatPrice(coin.current_price)}</div>
              <div className={`text-sm ${coin.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPriceChange(coin.price_change_percentage_24h)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentCoinsResults;