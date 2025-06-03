import React, { useState, useEffect } from 'react';
import { useHeadlessDelegatedActions, usePrivy } from '@privy-io/react-auth';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { DelegateWalletButtonProps } from '@/types/wallet';

export default function DelegateWalletButton({ 
  walletAddress, 
  chainType = 'solana',
  onSuccess,
  onDelegationChange,
  className
}: DelegateWalletButtonProps) {
  const { delegateWallet, revokeWallets } = useHeadlessDelegatedActions();
  const { user } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [delegateSuccess, setDelegateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check delegation status on component mount
  useEffect(() => {
    if (!user || !walletAddress) return;
    
    // Find the wallet in user's linked accounts
    const isDelegated = user.linkedAccounts.some(
      account => 
        account.type === 'wallet' && 
        account.address.toLowerCase() === walletAddress.toLowerCase() && 
        account.delegated === true
    );
    
    setDelegateSuccess(isDelegated);
    if (onDelegationChange) onDelegationChange(isDelegated);
  }, [user, walletAddress, onDelegationChange]);

  const handleDelegateWallet = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await delegateWallet({
        address: walletAddress,
        chainType: chainType
      });
      
      setDelegateSuccess(true);
      if (onSuccess) onSuccess();
      if (onDelegationChange) onDelegationChange(true);
    } catch (err) {
      console.error('Error delegating wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to delegate wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeWallet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await revokeWallets();
      setDelegateSuccess(false);
      if (onDelegationChange) onDelegationChange(false);
    } catch (err) {
      console.error('Error revoking wallet delegation:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke wallet delegation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {delegateSuccess ? (
        <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
          <CheckCircle className="h-4 w-4" />
          <span>Wallet successfully delegated</span>
        </div>
      ) : null}
      
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      
      <button
        onClick={delegateSuccess ? handleRevokeWallet : handleDelegateWallet}
        disabled={loading || !walletAddress}
        className={`w-full px-4 py-2 rounded-lg transition text-sm ${
          delegateSuccess 
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' 
            : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/50'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading 
          ? 'Processing...' 
          : delegateSuccess 
            ? 'Revoke Delegation' 
            : 'Delegate Wallet'}
      </button>
      
      <p className="text-xs text-zinc-400">
        {delegateSuccess 
          ? 'Your wallet is delegated. The system can now perform transactions on your behalf.'
          : 'Delegate your wallet to allow automated trading based on TA signals.'}
      </p>
    </div>
  );
} 