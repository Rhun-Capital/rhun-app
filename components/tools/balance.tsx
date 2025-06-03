import React from 'react';
import { BalanceProps, TokenBalance } from '@/types/market';
import { Wallet } from 'lucide-react';

const Balance: React.FC<BalanceProps> = ({ toolCallId, toolInvocation }) => {
  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading balance data...</div>;
  }

  const { 
    totalBalance,
    tokens,
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

  const formatTokenAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Wallet Balance</h3>
          <div className="text-sm text-zinc-400">Total Value: {formatNumber(totalBalance)}</div>
        </div>
        <Wallet className="h-6 w-6 text-zinc-400" />
      </div>

      <div className="space-y-4">
        {tokens.map((token: TokenBalance) => (
          <div key={token.address} className="bg-zinc-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-white">{token.symbol}</div>
                <div className="text-sm text-zinc-400">{token.name}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-white">{formatNumber(token.value)}</div>
                <div className="text-sm text-zinc-400">{formatTokenAmount(token.amount)} {token.symbol}</div>
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              Price: {formatNumber(token.price)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-zinc-500 text-right">
        Last updated: {new Date(lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default Balance; 