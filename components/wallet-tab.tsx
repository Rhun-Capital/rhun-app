'use client';

import React, { useState, useEffect } from 'react';
import {useSolanaWallets} from '@privy-io/react-auth/solana';
import Image from 'next/image';


const LAMPORTS_PER_SOL = 1000000000;

export default function WalletTab({ agentId }: { agentId: string }) {
  const { createWallet, wallets } = useSolanaWallets();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

    // Fetch wallet address when available
    useEffect(() => {
        if (wallets.length > 0) {
            // loop over wallets and look for wallet.connectorType === "embedded"
            for (const wallet of wallets) {
                if (wallet.connectorType === 'embedded') {
                    console.log(wallet);
                    setWalletAddress(wallet.address);
                    break;
                }
            }
        }
    }, [wallets]);

    // Fetch balance
    const fetchBalance = async (walletId: string) => {
        try {
        const response = await fetch(`/api/wallets/${walletId}/balance`);
        if (!response.ok) throw new Error('Failed to fetch balance');
        const data = await response.json();
        setBalance(data.balance);
        } catch (error) {
        console.error('Error fetching balance:', error);
        }
    };


    useEffect(() => {
        if (walletAddress) {
            fetchBalance(walletAddress);
            // Refresh balance every 30 seconds
            const interval = setInterval(() => fetchBalance(walletAddress), 30000);
            return () => clearInterval(interval);
        }
        }, [walletAddress]);    



  const handleCreateWallet = async () => {
    try {
      setLoading(true);
      const wallet = await createWallet();
      setWalletAddress(wallet.address);
      
      await fetch(`/api/agents/${agentId}/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: wallet.address }),
      });
    } catch (error) {
      console.error('Error creating wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-700 pb-4">
        <div className='flex items-center gap-3'>
            <Image src="/images/chains/solana.svg" alt="Solana Logo" width={14} height={14} />
            <h2 className="text-lg font-semibold">Agent Wallet</h2>
        </div>
        
        <p className="text-sm text-zinc-400">Manage your agent's Solana wallet</p>
      </div>

      {!walletAddress ? (
        <div className="p-6 bg-zinc-800 rounded-lg">
          <button
            onClick={handleCreateWallet}
            disabled={loading}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating Wallet...' : 'Create Wallet'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Wallet Info Card */}
          <div className="p-6 bg-zinc-800 rounded-lg space-y-4">
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-1">Wallet Address</h3>
              <code className="text-sm text-zinc-300 break-all">{walletAddress}</code>
            </div>
            
            {/* Balance Display */}
            <div className="pt-4 border-t border-zinc-700">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Balance</h3>
              <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-4">
                <Image src="/images/chains/solana.svg" alt="Solana Logo" width={14} height={14} />
                <span className="text-xl font-semibold">
                  {balance === null ? "0" : balance.toFixed(4)}
                </span>
                <span className="text-zinc-400">SOL</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}