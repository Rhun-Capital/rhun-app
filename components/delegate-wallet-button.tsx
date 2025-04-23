import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { useDelegatedActions } from '@privy-io/react-auth';
import type { WalletWithMetadata } from '@privy-io/react-auth';

interface DelegateWalletButtonProps {
  agentWalletAddress: string | null;
  onDelegationComplete?: () => void;
}

export default function DelegateWalletButton({ agentWalletAddress, onDelegationComplete }: DelegateWalletButtonProps) {
  const { user } = usePrivy();
  const { wallets, ready } = useSolanaWallets();
  const { delegateWallet, revokeWallets } = useDelegatedActions();
  const [isLoading, setIsLoading] = useState(false);

  // Find the wallet to delegate
  const walletToDelegate = wallets.find(
    (wallet) => wallet.address === agentWalletAddress && wallet.walletClientType === 'privy'
  );

  // Check if the wallet is already delegated
  const isWalletDelegated = !!user?.linkedAccounts.find(
    (account): account is WalletWithMetadata => 
      account.type === 'wallet' && 
      account.address === agentWalletAddress && 
      account.delegated
  );

  const handleDelegateWallet = async () => {
    if (!walletToDelegate || !ready || !agentWalletAddress) return;
    
    try {
      setIsLoading(true);
      await delegateWallet({
        address: agentWalletAddress,
        chainType: 'solana'
      });
      if (onDelegationComplete) {
        onDelegationComplete();
      }
    } catch (error) {
      console.error('Error delegating wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!isWalletDelegated) return;
    
    try {
      setIsLoading(true);
      await revokeWallets();
    } catch (error) {
      console.error('Error revoking delegated access:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!agentWalletAddress) {
    return null;
  }

  return (
    <div className="mt-4">
      {isWalletDelegated ? (
        <button
          onClick={handleRevokeAccess}
          disabled={isLoading}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition disabled:opacity-50 text-sm"
        >
          {isLoading ? 'Processing...' : 'Revoke Server Access'}
        </button>
      ) : (
        <button
          onClick={handleDelegateWallet}
          disabled={isLoading || !walletToDelegate || !ready}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition disabled:opacity-50 text-sm"
        >
          {isLoading ? 'Processing...' : 'Enable Server Access'}
        </button>
      )}
      <p className="text-xs text-zinc-400 mt-1">
        {isWalletDelegated
          ? 'Server has access to perform actions with this wallet'
          : 'Enable server to perform actions with this wallet'}
      </p>
    </div>
  );
} 