import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import CopyButton from '@/components/copy-button';
import TokenIcon from '@/components/token-icon';
import { formatAmount, formatAddress } from '@/utils/format';

interface WhaleActivityProps {
  toolInvocation: any;
}

const WhaleActivity: React.FC<WhaleActivityProps> = ({ toolInvocation }) => {
  if (!toolInvocation || !toolInvocation.result) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg">
        <div className="text-sm text-zinc-400">No whale activity data available</div>
      </div>
    );
  }

  const { whales, timeRange, count } = toolInvocation.result;

  if (!whales || whales.length === 0) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg">
        <div className="text-sm text-zinc-400">No whale activity found in the last 24 hours</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg space-y-4">
      <div className="text-sm text-zinc-400">
        Found {count} whale movements in the last 24 hours
      </div>
      
      <div className="space-y-4">
        {whales.map((whale: any, index: number) => (
          <div key={index} className="bg-zinc-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">
                  {formatAddress(whale.holder_address)}
                  <CopyButton text={whale.holder_address} />
                </div>
              </div>
              <div className="text-sm text-zinc-400">
                {formatDistanceToNow(new Date(whale.last_trade_timestamp * 1000))} ago
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <TokenIcon 
                symbol={whale.holder_mapping?.token_symbol || 'Unknown'} 
                logoURI={whale.holder_mapping?.token_logo_uri} 
                size={32}
              />
              <div>
                <div className="text-sm font-medium">
                  {whale.holder_mapping?.token_name || 'Unknown Token'}
                </div>
                <div className="text-xs text-zinc-400">
                  {whale.holder_mapping?.token_symbol || 'Unknown'}
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-sm">
              <span className="text-zinc-400">Total trades:</span>{' '}
              <span className="font-medium">{whale.totalTrades}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhaleActivity; 