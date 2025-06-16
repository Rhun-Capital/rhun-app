import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createPool } from '@/utils/meteora-dynamic';
import { toast } from 'sonner';

interface PoolCreateProps {
  tokenA: string;
  tokenB: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  onPoolCreated?: (poolAddress: string) => void;
}

export function PoolCreate({ tokenA, tokenB, tokenASymbol, tokenBSymbol, onPoolCreated }: PoolCreateProps) {
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreatePool = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      const poolAddress = await createPool(tokenA, tokenB);
      toast.success('Pool created successfully!');
      if (onPoolCreated) {
        onPoolCreated(poolAddress);
      }
    } catch (error) {
      console.error('Error creating pool:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create pool');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-white mb-2">Create New Pool</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Create a new liquidity pool for {tokenASymbol}/{tokenBSymbol}
        </p>
        <button
          onClick={handleCreatePool}
          disabled={!publicKey || isLoading}
          className="w-full px-4 py-2 text-white bg-indigo-600 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating Pool...' : 'Create Pool'}
        </button>
      </div>
    </div>
  );
} 