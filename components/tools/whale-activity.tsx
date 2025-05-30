import React from 'react';
import { WhaleActivityProps, WhaleTransaction } from '@/types/market';
import { ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const WhaleActivity: React.FC<WhaleActivityProps> = ({ toolCallId, toolInvocation }) => {
  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading whale activity...</div>;
  }

  const { transactions } = toolInvocation.result;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Whale Activity</h3>
      <div className="space-y-4">
        {transactions.map((tx: WhaleTransaction) => (
          <div key={tx.hash} className="bg-zinc-800/30 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  {tx.type === 'buy' ? (
                    <ArrowUpRight className="h-5 w-5 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium text-white">
                    {tx.type === 'buy' ? 'Buy' : 'Sell'}
                  </span>
                </div>
                <div className="text-sm text-zinc-400 mt-1">
                  {formatTimestamp(tx.timestamp)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-white">{formatAmount(tx.amount)}</div>
                <div className="text-sm text-zinc-400">{tx.token}</div>
              </div>
            </div>
            <div className="text-sm text-zinc-400">
              <div className="flex items-center justify-between mb-1">
                <span>From:</span>
                <span>{formatAddress(tx.from)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>To:</span>
                <span>{formatAddress(tx.to)}</span>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Link 
                href={tx.explorerUrl} 
                target="_blank" 
                className="text-zinc-400 hover:text-zinc-300"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhaleActivity; 