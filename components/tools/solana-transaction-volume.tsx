import React from 'react';
import Image from 'next/image';
import LoadingIndicator from '@/components/loading-indicator';

interface ToolInvocation {
  args: {
    message: string;
  };
  result?: {
    volume: {
      volumeUSD: number;
      volumeSOL: number;
    };
  };
}

interface SolanaTransactionVolumeProps {
  toolInvocation: ToolInvocation;
  toolCallId: string;
}

const SolanaTransactionVolume: React.FC<SolanaTransactionVolumeProps> = ({ toolInvocation, toolCallId }) => {
  return (
    <div key={toolCallId}>
      <div className="p-6 bg-zinc-800 rounded-lg">
        {toolInvocation.args.message}
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Transaction Volume</h3>
          <small className="text-zinc-400">Last 24 hours</small>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-1">Volume (USD)</div>
            <div className="text-lg font-bold">
              {toolInvocation.result ? 
                toolInvocation.result.volume.volumeUSD.toLocaleString(undefined, {
                  maximumFractionDigits: 2
                }) : <LoadingIndicator/>}
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <div className="text-sm text-zinc-400 mb-1">Volume (SOL)</div>
            <div className="text-lg font-bold flex items-center gap-2">
              <Image src="https://d1olseq3j3ep4p.cloudfront.net/images/chains/solana.svg" alt="Solana Logo" width={14} height={14} />
              {toolInvocation.result ? 
                toolInvocation.result.volume.volumeSOL.toLocaleString(undefined, {
                  maximumFractionDigits: 2
                }) : <LoadingIndicator/>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolanaTransactionVolume;